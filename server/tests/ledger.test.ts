import { describe, it, expect } from "vitest";
import { Types } from "mongoose";
import { LedgerService } from "../src/services/ledgerService";
import { AccountService } from "../src/services/accountService";
import { User } from "../src/models/User";
import { JournalEntry, LedgerPosting } from "../src/models/Ledger";
import { PostingDirection, TransactionType } from "@vaultbank/shared";

describe("Double-Entry Ledger Integrity Suite", () => {
  it("should post a balanced journal entry when debits equal credits", async () => {
    const { settlementVault, promoExpense } = await LedgerService.ensureSystemAccounts("USD");

    const journal = await LedgerService.postJournalEntry({
      description: "Test Balanced Entry",
      type: TransactionType.DEPOSIT_SIMULATION,
      currency: "USD",
      postings: [
        {
          ledgerAccountId: settlementVault._id as Types.ObjectId,
          direction: PostingDirection.DEBIT,
          amountCents: 50000, // $500.00
          currency: "USD",
        },
        {
          ledgerAccountId: promoExpense._id as Types.ObjectId,
          direction: PostingDirection.CREDIT,
          amountCents: 50000, // $500.00
          currency: "USD",
        },
      ],
    });

    expect(journal).toBeDefined();
    expect(journal.totalAmountCents).toBe(50000);
    expect(journal.status).toBe("POSTED");

    const postings = await LedgerPosting.find({ journalEntryId: journal._id });
    expect(postings).toHaveLength(2);
  });

  it("should strictly reject an unbalanced journal entry and abort", async () => {
    const { settlementVault, promoExpense } = await LedgerService.ensureSystemAccounts("USD");

    await expect(
      LedgerService.postJournalEntry({
        description: "Unbalanced Entry",
        type: TransactionType.DEPOSIT_SIMULATION,
        currency: "USD",
        postings: [
          {
            ledgerAccountId: settlementVault._id as Types.ObjectId,
            direction: PostingDirection.DEBIT,
            amountCents: 50000, // $500.00
            currency: "USD",
          },
          {
            ledgerAccountId: promoExpense._id as Types.ObjectId,
            direction: PostingDirection.CREDIT,
            amountCents: 40000, // $400.00 - Discrepancy of $100!
            currency: "USD",
          },
        ],
      })
    ).rejects.toThrow(/Double-entry imbalance/);

    // Verify nothing was persisted
    const entries = await JournalEntry.find({ description: "Unbalanced Entry" });
    expect(entries).toHaveLength(0);
  });

  it("should accurately reconcile account balance from immutable postings", async () => {
    const user = await User.create({
      fullName: "Reconcile User",
      email: "rec@example.com",
      phoneNumber: "+14155558888",
      passwordHash: "hash",
      role: "CUSTOMER",
    });

    const account = await AccountService.createAccount(user._id as Types.ObjectId, "CURRENT", "USD");
    const { settlementVault } = await LedgerService.ensureSystemAccounts("USD");

    // Post 1: Credit $1,000.00 to account
    await LedgerService.postJournalEntry({
      description: "Credit 1000",
      type: TransactionType.DEPOSIT_SIMULATION,
      currency: "USD",
      postings: [
        {
          ledgerAccountId: settlementVault._id as Types.ObjectId,
          direction: PostingDirection.DEBIT,
          amountCents: 100000,
          currency: "USD",
        },
        {
          ledgerAccountId: account.ledgerAccountId,
          bankAccountId: account._id as Types.ObjectId,
          direction: PostingDirection.CREDIT,
          amountCents: 100000,
          currency: "USD",
        },
      ],
    });

    account.ledgerBalanceCents = 100000;
    await account.save();

    const rec = await LedgerService.reconcileAccount(account._id);
    expect(rec.isBalanced).toBe(true);
    expect(rec.computedLedgerBalanceCents).toBe(100000);
    expect(rec.discrepancyCents).toBe(0);
  });
});

