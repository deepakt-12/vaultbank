import mongoose, { ClientSession, Types } from "mongoose";
import { v4 as uuidv4 } from "uuid";
import {
  AccountStatus,
  AuditAction,
  Currency,
  PostingDirection,
  TransactionType,
  TransferInput,
  TransferStatus,
} from "@vaultbank/shared";
import { BankAccount, IBankAccount } from "../models/BankAccount";
import { ITransfer, Transfer } from "../models/Transfer";
import { IdempotencyRecord } from "../models/IdempotencyRecord";
import { Notification } from "../models/Notification";
import { LedgerService } from "./ledgerService";
import { FraudDetectionService } from "./fraudDetectionService";
import { logAuditEvent } from "./auditService";
import { AppError } from "../middleware/errorHandler";
import { generateFingerprint } from "../utils/crypto";
import { logger } from "../utils/logger";

async function checkReplicaSetSupport(): Promise<boolean> {
  try {
    if (!mongoose.connection.db) return false;
    const hello = await mongoose.connection.db.admin().command({ hello: 1 });
    return Boolean(hello.setName || hello.msg === "isdbgrid");
  } catch {
    return false;
  }
}

export interface TransferResult {
  transfer: ITransfer;
  isIdempotentReplay: boolean;
  receiptNumber: string;
}

export class TransferService {
  /**
   * Executes an internal transfer between two customer accounts atomically.
   */
  public static async executeInternalTransfer(
    userId: string | Types.ObjectId,
    input: TransferInput,
    ipAddress?: string,
    userAgent?: string
  ): Promise<TransferResult> {
    const userObjId = new Types.ObjectId(userId.toString());
    const sourceAccObjId = new Types.ObjectId(input.sourceAccountId);

    // 1. Idempotency Check & Fingerprinting
    const requestFingerprint = generateFingerprint({
      sourceAccountId: input.sourceAccountId,
      destinationAccountNumber: input.destinationAccountNumber,
      amountCents: input.amountCents,
      currency: input.currency,
    });

    const existingIdempotency = await IdempotencyRecord.findOne({
      key: input.idempotencyKey,
      userId: userObjId,
    });

    if (existingIdempotency) {
      if (existingIdempotency.requestHash !== requestFingerprint) {
        throw new AppError(
          "Conflict: Idempotency key reused with differing request parameters.",
          409,
          "IDEMPOTENCY_KEY_REUSE_MISMATCH"
        );
      }
      if (existingIdempotency.status === "COMPLETED") {
        return {
          transfer: existingIdempotency.responsePayload as ITransfer,
          isIdempotentReplay: true,
          receiptNumber: (existingIdempotency.responsePayload as ITransfer).receiptNumber,
        };
      }
      if (existingIdempotency.status === "PROCESSING") {
        throw new AppError(
          "Transaction is currently processing. Please do not retry immediately.",
          409,
          "TRANSACTION_IN_PROGRESS"
        );
      }
    }

    // 2. Pre-transaction Fraud & Risk Evaluation
    const riskResult = await FraudDetectionService.evaluateTransferRisk(
      sourceAccObjId,
      userObjId,
      input.amountCents
    );

    // 3. Execution within MongoDB Session Transaction (if replica set is supported)
    let session: ClientSession | null = null;
    const supportsTransactions = await checkReplicaSetSupport();

    if (supportsTransactions) {
      try {
        session = await mongoose.startSession();
        session.startTransaction();
      } catch (err) {
        logger.warn({ err }, "Could not initiate MongoDB session transaction");
        session = null;
      }
    }

    try {
      // Record in-progress idempotency
      if (session) {
        await IdempotencyRecord.create(
          [
            {
              key: input.idempotencyKey,
              userId: userObjId,
              requestHash: requestFingerprint,
              status: "PROCESSING",
            },
          ],
          { session }
        );
      } else {
        await IdempotencyRecord.create({
          key: input.idempotencyKey,
          userId: userObjId,
          requestHash: requestFingerprint,
          status: "PROCESSING",
        });
      }

      // Fetch and lock source account
      const sourceAccount = await BankAccount.findOne(
        {
          _id: sourceAccObjId,
          userId: userObjId,
        },
        null,
        session ? { session } : undefined
      );

      if (!sourceAccount) {
        throw new AppError("Source bank account not found or access denied.", 404);
      }

      if (sourceAccount.status !== AccountStatus.ACTIVE) {
        throw new AppError(`Source bank account is ${sourceAccount.status}. Transfers disabled.`, 422);
      }

      if (sourceAccount.availableBalanceCents < input.amountCents) {
        throw new AppError(
          `Insufficient funds. Available balance: ${(sourceAccount.availableBalanceCents / 100).toFixed(
            2
          )} ${sourceAccount.currency}, required: ${(input.amountCents / 100).toFixed(2)} ${input.currency}.`,
          422,
          "INSUFFICIENT_FUNDS"
        );
      }

      // Fetch destination account
      const destinationAccount = await BankAccount.findOne(
        {
          accountNumber: input.destinationAccountNumber.trim(),
        },
        null,
        session ? { session } : undefined
      );

      if (!destinationAccount) {
        throw new AppError("Destination bank account not found.", 404, "DESTINATION_NOT_FOUND");
      }

      if (destinationAccount._id.toString() === sourceAccount._id.toString()) {
        throw new AppError("Cannot transfer funds to the same source account.", 400);
      }

      if (destinationAccount.status !== AccountStatus.ACTIVE) {
        throw new AppError("Destination bank account is not active.", 422);
      }

      if (destinationAccount.currency !== sourceAccount.currency) {
        throw new AppError(
          `Cross-currency transfers (${sourceAccount.currency} to ${destinationAccount.currency}) are not supported in standard tier.`,
          400
        );
      }

      const receiptNumber = `RCP-${Date.now().toString(36).toUpperCase()}-${uuidv4().substring(0, 6).toUpperCase()}`;

      // Execute Balanced Double-Entry Journal Postings
      // Sender: DEBIT (Liability account reduction)
      // Recipient: CREDIT (Liability account increment)
      const journalEntry = await LedgerService.postJournalEntry(
        {
          description: `Internal Transfer: ${input.description || "Funds transfer"}`,
          type: TransactionType.INTERNAL_TRANSFER,
          currency: sourceAccount.currency,
          metadata: {
            sourceAccountNumber: sourceAccount.accountNumber,
            destinationAccountNumber: destinationAccount.accountNumber,
            receiptNumber,
          },
          postings: [
            {
              ledgerAccountId: sourceAccount.ledgerAccountId,
              bankAccountId: sourceAccount._id as Types.ObjectId,
              direction: PostingDirection.DEBIT,
              amountCents: input.amountCents,
              currency: sourceAccount.currency,
            },
            {
              ledgerAccountId: destinationAccount.ledgerAccountId,
              bankAccountId: destinationAccount._id as Types.ObjectId,
              direction: PostingDirection.CREDIT,
              amountCents: input.amountCents,
              currency: destinationAccount.currency,
            },
          ],
        },
        session || undefined
      );

      // Atomically update cached balances with sufficient funds condition
      const updateResult = await BankAccount.updateOne(
        { _id: sourceAccount._id, availableBalanceCents: { $gte: input.amountCents } },
        {
          $inc: {
            availableBalanceCents: -input.amountCents,
            ledgerBalanceCents: -input.amountCents,
          },
        },
        session ? { session } : undefined
      );

      if (updateResult.modifiedCount === 0) {
        throw new AppError("Insufficient funds or concurrent update detected.", 422, "INSUFFICIENT_FUNDS");
      }

      await BankAccount.updateOne(
        { _id: destinationAccount._id },
        {
          $inc: {
            availableBalanceCents: input.amountCents,
            ledgerBalanceCents: input.amountCents,
          },
        },
        session ? { session } : undefined
      );

      // Create Transfer Record
      const transferRecords = await Transfer.create(
        [
          {
            transferId: uuidv4(),
            idempotencyKey: input.idempotencyKey,
            sourceAccountId: sourceAccount._id,
            sourceUserId: sourceAccount.userId,
            destinationAccountId: destinationAccount._id,
            destinationUserId: destinationAccount.userId,
            amountCents: input.amountCents,
            currency: sourceAccount.currency,
            status: TransferStatus.POSTED,
            journalEntryId: journalEntry._id,
            description: input.description,
            receiptNumber,
            riskScore: riskResult.riskScore,
          },
        ],
        session ? { session } : undefined
      );

      const transfer = transferRecords[0];

      // Update Idempotency Record to COMPLETED
      await IdempotencyRecord.updateOne(
        { key: input.idempotencyKey, userId: userObjId },
        {
          status: "COMPLETED",
          statusCode: 201,
          responsePayload: transfer.toObject(),
        },
        session ? { session } : undefined
      );

      // Create Notifications for sender and recipient
      await Notification.create(
        [
          {
            userId: sourceAccount.userId,
            title: "Transfer Sent",
            message: `You transferred ${(input.amountCents / 100).toFixed(2)} ${sourceAccount.currency} to ${destinationAccount.accountNumber}. Receipt: ${receiptNumber}`,
            type: "TRANSACTION",
          },
          {
            userId: destinationAccount.userId,
            title: "Transfer Received",
            message: `You received ${(input.amountCents / 100).toFixed(2)} ${destinationAccount.currency} from account ending in ${sourceAccount.accountNumber.slice(-4)}.`,
            type: "TRANSACTION",
          },
        ],
        session ? { session } : undefined
      );

      if (session) {
        await session.commitTransaction();
      }

      // Log Asynchronous Audit Event
      logAuditEvent({
        userId: userObjId,
        action: AuditAction.TRANSFER_POSTED,
        details: {
          transferId: transfer.transferId,
          receiptNumber,
          amountCents: input.amountCents,
          sourceAccountId: sourceAccount._id,
          destinationAccountId: destinationAccount._id,
          riskScore: riskResult.riskScore,
        },
        ipAddress,
        userAgent,
      }).catch(() => {});

      return {
        transfer,
        isIdempotentReplay: false,
        receiptNumber,
      };
    } catch (error) {
      if (session) {
        await session.abortTransaction();
      }
      logger.error({ error, idempotencyKey: input.idempotencyKey }, "Transfer execution failed");
      throw error;
    } finally {
      if (session) {
        session.endSession();
      }
    }
  }

  /**
   * Educational simulation: Deposit funds from Central Vault into customer account
   */
  public static async executeSimulatedDeposit(
    userId: string | Types.ObjectId,
    accountId: string | Types.ObjectId,
    amountCents: number,
    description: string = "Simulated Deposit"
  ): Promise<IBankAccount> {
    const account = await BankAccount.findOne({
      _id: new Types.ObjectId(accountId.toString()),
      userId: new Types.ObjectId(userId.toString()),
    });

    if (!account) {
      throw new AppError("Account not found", 404);
    }

    const { settlementVault } = await LedgerService.ensureSystemAccounts(account.currency);

    // Double-entry posting:
    // Debit: Settlement Vault Asset
    // Credit: Customer Liability
    await LedgerService.postJournalEntry({
      description,
      type: TransactionType.DEPOSIT_SIMULATION,
      currency: account.currency,
      postings: [
        {
          ledgerAccountId: settlementVault._id as Types.ObjectId,
          direction: PostingDirection.DEBIT,
          amountCents,
          currency: account.currency,
        },
        {
          ledgerAccountId: account.ledgerAccountId,
          bankAccountId: account._id as Types.ObjectId,
          direction: PostingDirection.CREDIT,
          amountCents,
          currency: account.currency,
        },
      ],
    });

    account.availableBalanceCents += amountCents;
    account.ledgerBalanceCents += amountCents;
    await account.save();

    await Notification.create({
      userId: account.userId,
      title: "Simulated Deposit Credited",
      message: `Simulated deposit of ${(amountCents / 100).toFixed(2)} ${account.currency} credited to ${account.accountNumber}.`,
      type: "TRANSACTION",
    });

    return account;
  }

  /**
   * Educational simulation: Withdraw funds from customer account into Central Vault
   */
  public static async executeSimulatedWithdrawal(
    userId: string | Types.ObjectId,
    accountId: string | Types.ObjectId,
    amountCents: number,
    description: string = "Simulated Withdrawal"
  ): Promise<IBankAccount> {
    const account = await BankAccount.findOne({
      _id: new Types.ObjectId(accountId.toString()),
      userId: new Types.ObjectId(userId.toString()),
    });

    if (!account) {
      throw new AppError("Account not found", 404);
    }

    if (account.availableBalanceCents < amountCents) {
      throw new AppError("Insufficient funds for simulated withdrawal", 422);
    }

    const { settlementVault } = await LedgerService.ensureSystemAccounts(account.currency);

    // Double-entry posting:
    // Debit: Customer Liability
    // Credit: Settlement Vault Asset
    await LedgerService.postJournalEntry({
      description,
      type: TransactionType.WITHDRAWAL_SIMULATION,
      currency: account.currency,
      postings: [
        {
          ledgerAccountId: account.ledgerAccountId,
          bankAccountId: account._id as Types.ObjectId,
          direction: PostingDirection.DEBIT,
          amountCents,
          currency: account.currency,
        },
        {
          ledgerAccountId: settlementVault._id as Types.ObjectId,
          direction: PostingDirection.CREDIT,
          amountCents,
          currency: account.currency,
        },
      ],
    });

    account.availableBalanceCents -= amountCents;
    account.ledgerBalanceCents -= amountCents;
    await account.save();

    await Notification.create({
      userId: account.userId,
      title: "Simulated Withdrawal Processed",
      message: `Simulated withdrawal of ${(amountCents / 100).toFixed(2)} ${account.currency} debited from ${account.accountNumber}.`,
      type: "TRANSACTION",
    });

    return account;
  }
}
