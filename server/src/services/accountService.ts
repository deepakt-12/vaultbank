import { ClientSession, Types } from "mongoose";
import {
  AccountStatus,
  AccountType,
  Currency,
  LedgerAccountType,
  PostingDirection,
} from "@vaultbank/shared";
import { BankAccount, IBankAccount } from "../models/BankAccount";
import { LedgerAccount } from "../models/Ledger";
import { generateAccountNumber } from "../utils/crypto";
import { AppError } from "../middleware/errorHandler";
import { LedgerPosting } from "../models/Ledger";
import { Transfer } from "../models/Transfer";

export class AccountService {
  /**
   * Opens a new bank account with its corresponding ledger liability account.
   */
  public static async createAccount(
    userId: string | Types.ObjectId,
    accountType: AccountType,
    currency: Currency = "USD",
    nickname?: string,
    session?: ClientSession
  ): Promise<IBankAccount> {
    const userObjId = new Types.ObjectId(userId.toString());

    // Generate unique account number
    let accountNumber = generateAccountNumber();
    while (await BankAccount.findOne({ accountNumber })) {
      accountNumber = generateAccountNumber();
    }

    // Create corresponding LedgerAccount (Liability: customer deposit)
    const ledgerAccountCode = `2000-${accountNumber}`;
    const [ledgerAccount] = await LedgerAccount.create(
      [
        {
          code: ledgerAccountCode,
          name: `Customer Deposit (${accountType}) - ${accountNumber}`,
          type: LedgerAccountType.LIABILITY,
          normalBalance: PostingDirection.CREDIT,
          currency,
          isSystemAccount: false,
        },
      ],
      { session }
    );

    // Create BankAccount
    const [bankAccount] = await BankAccount.create(
      [
        {
          accountNumber,
          userId: userObjId,
          accountType,
          currency,
          availableBalanceCents: 0,
          ledgerBalanceCents: 0,
          status: AccountStatus.ACTIVE,
          nickname: nickname || `${accountType.charAt(0) + accountType.slice(1).toLowerCase()} Account`,
          ledgerAccountId: ledgerAccount._id,
        },
      ],
      { session }
    );

    // Link BankAccount back to LedgerAccount
    ledgerAccount.bankAccountId = bankAccount._id as Types.ObjectId;
    await ledgerAccount.save({ session });

    return bankAccount;
  }

  /**
   * Retrieves all accounts owned by a user
   */
  public static async getUserAccounts(userId: string | Types.ObjectId): Promise<IBankAccount[]> {
    return BankAccount.find({
      userId: new Types.ObjectId(userId.toString()),
      status: { $ne: AccountStatus.CLOSED },
    }).sort({ createdAt: 1 });
  }

  /**
   * Retrieves account by ID with permission check
   */
  public static async getAccountById(
    accountId: string | Types.ObjectId,
    userId?: string | Types.ObjectId,
    isAdminOrStaff: boolean = false
  ): Promise<IBankAccount> {
    const account = await BankAccount.findById(accountId);
    if (!account) {
      throw new AppError("Bank account not found", 404);
    }

    if (!isAdminOrStaff && userId && account.userId.toString() !== userId.toString()) {
      throw new AppError("Unauthorized access to requested bank account", 403, "FORBIDDEN");
    }

    return account;
  }

  /**
   * Retrieves account transaction history combining ledger postings and transfer details
   */
  public static async getAccountTransactions(
    accountId: string | Types.ObjectId,
    page: number = 1,
    limit: number = 20
  ) {
    const accObjId = new Types.ObjectId(accountId.toString());
    const skip = (page - 1) * limit;

    const postings = await LedgerPosting.find({ bankAccountId: accObjId })
      .populate("journalEntryId")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalCount = await LedgerPosting.countDocuments({ bankAccountId: accObjId });

    return {
      postings,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  /**
   * Generates CSV string of authorized account transaction history
   */
  public static async exportTransactionsCsv(accountId: string | Types.ObjectId): Promise<string> {
    const accObjId = new Types.ObjectId(accountId.toString());
    const account = await BankAccount.findById(accObjId);
    if (!account) throw new AppError("Account not found", 404);

    const postings = await LedgerPosting.find({ bankAccountId: accObjId })
      .populate<{ journalEntryId: { description: string; type: string; reference: string; postedAt: Date } }>(
        "journalEntryId"
      )
      .sort({ createdAt: -1 });

    const rows: string[] = [
      "Posting Date,Reference,Type,Description,Direction,Amount (Cents),Currency",
    ];

    for (const p of postings) {
      const j = p.journalEntryId;
      const date = j?.postedAt ? new Date(j.postedAt).toISOString() : new Date(p.createdAt).toISOString();
      const ref = j?.reference || "N/A";
      const type = j?.type || "N/A";
      const desc = `"${(j?.description || "").replace(/"/g, '""')}"`;
      rows.push(`${date},${ref},${type},${desc},${p.direction},${p.amountCents},${p.currency}`);
    }

    return rows.join("\n");
  }
}

