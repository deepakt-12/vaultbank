import { ClientSession, Types } from "mongoose";
import { v4 as uuidv4 } from "uuid";
import {
  Currency,
  LedgerAccountType,
  PostingDirection,
  TransactionType,
} from "@vaultbank/shared";
import {
  IJournalEntry,
  ILedgerAccount,
  JournalEntry,
  LedgerAccount,
  LedgerPosting,
} from "../models/Ledger";
import { BankAccount } from "../models/BankAccount";
import { AppError } from "../middleware/errorHandler";
import { logger } from "../utils/logger";

export interface PostingInstruction {
  ledgerAccountId: Types.ObjectId;
  bankAccountId?: Types.ObjectId;
  direction: PostingDirection;
  amountCents: number;
  currency: Currency;
}

export interface PostJournalOptions {
  description: string;
  type: TransactionType;
  currency: Currency;
  postings: PostingInstruction[];
  metadata?: Record<string, unknown>;
  reference?: string;
  reversalOfJournalId?: Types.ObjectId;
}

export class LedgerService {
  /**
   * Bootstraps system accounts (Settlement Vault Asset, Promotional Expense, etc.)
   */
  public static async ensureSystemAccounts(currency: Currency = "USD"): Promise<{
    settlementVault: ILedgerAccount;
    promoExpense: ILedgerAccount;
  }> {
    const vaultCode = `1001-VAULT-${currency}`;
    let settlementVault = await LedgerAccount.findOne({ code: vaultCode });
    if (!settlementVault) {
      settlementVault = await LedgerAccount.create({
        code: vaultCode,
        name: `VaultBank Central Settlement Vault (${currency})`,
        type: LedgerAccountType.ASSET,
        normalBalance: PostingDirection.DEBIT,
        currency,
        isSystemAccount: true,
      });
    }

    const promoCode = `5001-PROMO-${currency}`;
    let promoExpense = await LedgerAccount.findOne({ code: promoCode });
    if (!promoExpense) {
      promoExpense = await LedgerAccount.create({
        code: promoCode,
        name: `Simulation & Seed Promotional Expense (${currency})`,
        type: LedgerAccountType.EXPENSE,
        normalBalance: PostingDirection.DEBIT,
        currency,
        isSystemAccount: true,
      });
    }

    return { settlementVault, promoExpense };
  }

  /**
   * Posts an atomic, balanced Journal Entry with debit and credit postings.
   * Enforces that total debits EQUAL total credits.
   */
  public static async postJournalEntry(
    options: PostJournalOptions,
    session?: ClientSession
  ): Promise<IJournalEntry> {
    const { description, type, currency, postings, metadata, reversalOfJournalId } = options;

    if (!postings || postings.length < 2) {
      throw new AppError("A balanced journal entry requires at least 2 postings.", 400);
    }

    // Double-entry validation: Total Debits must strictly equal Total Credits
    let totalDebits = 0;
    let totalCredits = 0;

    for (const posting of postings) {
      if (!Number.isInteger(posting.amountCents) || posting.amountCents <= 0) {
        throw new AppError(
          `Invalid posting amount: ${posting.amountCents}. Must be a strictly positive integer.`,
          400
        );
      }
      if (posting.currency !== currency) {
        throw new AppError(
          `Multi-currency posting mismatch: Expected ${currency}, got ${posting.currency}`,
          400
        );
      }

      if (posting.direction === PostingDirection.DEBIT) {
        totalDebits += posting.amountCents;
      } else if (posting.direction === PostingDirection.CREDIT) {
        totalCredits += posting.amountCents;
      } else {
        throw new AppError(`Invalid posting direction: ${posting.direction}`, 400);
      }
    }

    if (totalDebits !== totalCredits) {
      throw new AppError(
        `Double-entry imbalance: Total debits (${totalDebits}) do not equal total credits (${totalCredits}).`,
        400,
        "LEDGER_UNBALANCED"
      );
    }

    const reference = options.reference || uuidv4();

    // Create the immutable JournalEntry
    const [journalEntry] = await JournalEntry.create(
      [
        {
          reference,
          description,
          type,
          currency,
          totalAmountCents: totalDebits,
          status: "POSTED",
          reversalOfJournalId,
          metadata,
          postedAt: new Date(),
        },
      ],
      { session }
    );

    // Create the postings
    const postingDocs = postings.map((p) => ({
      journalEntryId: journalEntry._id,
      ledgerAccountId: p.ledgerAccountId,
      bankAccountId: p.bankAccountId,
      direction: p.direction,
      amountCents: p.amountCents,
      currency: p.currency,
    }));

    await LedgerPosting.create(postingDocs, { session });

    logger.debug(
      {
        journalReference: reference,
        totalAmountCents: totalDebits,
        postingsCount: postings.length,
      },
      "Journal Entry posted successfully"
    );

    return journalEntry;
  }

  /**
   * Authoritative reconciliation: Computes balance from immutable ledger postings
   * and verifies against the cached BankAccount document balance.
   */
  public static async reconcileAccount(bankAccountId: string | Types.ObjectId): Promise<{
    bankAccountId: string;
    cachedLedgerBalanceCents: number;
    computedLedgerBalanceCents: number;
    isBalanced: boolean;
    discrepancyCents: number;
  }> {
    const account = await BankAccount.findById(bankAccountId);
    if (!account) {
      throw new AppError("Bank account not found", 404);
    }

    // Customer deposits are LIABILITIES to the bank.
    // In double-entry accounting for liabilities: Balance = Credits - Debits
    const postings = await LedgerPosting.find({ bankAccountId: account._id });

    let computedBalance = 0;
    for (const p of postings) {
      if (p.direction === PostingDirection.CREDIT) {
        computedBalance += p.amountCents;
      } else if (p.direction === PostingDirection.DEBIT) {
        computedBalance -= p.amountCents;
      }
    }

    const discrepancy = computedBalance - account.ledgerBalanceCents;
    const isBalanced = discrepancy === 0;

    if (!isBalanced) {
      logger.warn(
        {
          accountId: account._id,
          cached: account.ledgerBalanceCents,
          computed: computedBalance,
          discrepancy,
        },
        "RECONCILIATION DISCREPANCY DETECTED"
      );
    }

    return {
      bankAccountId: account._id.toString(),
      cachedLedgerBalanceCents: account.ledgerBalanceCents,
      computedLedgerBalanceCents: computedBalance,
      isBalanced,
      discrepancyCents: discrepancy,
    };
  }
}

