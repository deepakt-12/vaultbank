import mongoose, { Types } from "mongoose";
import { connectDB, disconnectDB } from "../config/db";
import { User } from "../models/User";
import { Session } from "../models/Session";
import { BankAccount } from "../models/BankAccount";
import { JournalEntry, LedgerAccount, LedgerPosting } from "../models/Ledger";
import { Transfer } from "../models/Transfer";
import { AuditEvent } from "../models/AuditEvent";
import { Notification } from "../models/Notification";
import { IdempotencyRecord } from "../models/IdempotencyRecord";
import { AdjustmentRequest } from "../models/AdjustmentRequest";
import { VerificationToken, PasswordResetToken } from "../models/Token";
import { hashPassword } from "../utils/crypto";
import { AccountService } from "../services/accountService";
import { LedgerService } from "../services/ledgerService";
import { PostingDirection, TransactionType, UserRole } from "@vaultbank/shared";
import { logger } from "../utils/logger";

async function runSeed() {
  logger.info("Initializing VaultBank Database Seeder...");
  await connectDB();

  // Clear existing collections
  await Promise.all([
    User.deleteMany({}),
    Session.deleteMany({}),
    BankAccount.deleteMany({}),
    LedgerAccount.deleteMany({}),
    JournalEntry.deleteMany({}),
    LedgerPosting.deleteMany({}),
    Transfer.deleteMany({}),
    AuditEvent.deleteMany({}),
    Notification.deleteMany({}),
    IdempotencyRecord.deleteMany({}),
    AdjustmentRequest.deleteMany({}),
    VerificationToken.deleteMany({}),
    PasswordResetToken.deleteMany({}),
  ]);
  logger.info("Cleared existing database records.");

  // 1. Ensure System Ledger Accounts
  const { settlementVault, promoExpense } = await LedgerService.ensureSystemAccounts("USD");

  // 2. Create Staff Users
  const staffUsers = [
    {
      fullName: "Alexander Hamilton",
      email: "admin@vaultbank.test",
      phoneNumber: "+14155550100",
      password: "VaultAdmin123!",
      role: UserRole.ADMIN,
    },
    {
      fullName: "Elena Rostova",
      email: "compliance@vaultbank.test",
      phoneNumber: "+14155550101",
      password: "VaultCompliance123!",
      role: UserRole.COMPLIANCE,
    },
    {
      fullName: "Marcus Vance",
      email: "support@vaultbank.test",
      phoneNumber: "+14155550102",
      password: "VaultSupport123!",
      role: UserRole.SUPPORT,
    },
  ];

  for (const staff of staffUsers) {
    const passwordHash = await hashPassword(staff.password);
    await User.create({
      fullName: staff.fullName,
      email: staff.email,
      phoneNumber: staff.phoneNumber,
      passwordHash,
      role: staff.role,
      status: "ACTIVE",
      isEmailVerified: true,
    });
    logger.info({ email: staff.email, role: staff.role }, "Created staff user");
  }

  // 3. Create Demo Customers
  const customer1PasswordHash = await hashPassword("CustomerPass123!");
  const customer1 = await User.create({
    fullName: "Sarah Connor",
    email: "customer1@vaultbank.test",
    phoneNumber: "+14155550201",
    passwordHash: customer1PasswordHash,
    role: UserRole.CUSTOMER,
    status: "ACTIVE",
    isEmailVerified: true,
  });

  const customer2PasswordHash = await hashPassword("CustomerPass123!");
  const customer2 = await User.create({
    fullName: "John Doe",
    email: "customer2@vaultbank.test",
    phoneNumber: "+14155550202",
    passwordHash: customer2PasswordHash,
    role: UserRole.CUSTOMER,
    status: "ACTIVE",
    isEmailVerified: true,
  });

  // 4. Create Bank Accounts & Ledger Liability Accounts
  const c1Checking = await AccountService.createAccount(
    customer1._id as Types.ObjectId,
    "CURRENT",
    "USD",
    "Primary Checking"
  );
  const c1Savings = await AccountService.createAccount(
    customer1._id as Types.ObjectId,
    "SAVINGS",
    "USD",
    "High-Yield Vault Savings"
  );

  const c2Checking = await AccountService.createAccount(
    customer2._id as Types.ObjectId,
    "CURRENT",
    "USD",
    "Everyday Checking"
  );
  const c2Savings = await AccountService.createAccount(
    customer2._id as Types.ObjectId,
    "SAVINGS",
    "USD",
    "Rainy Day Savings"
  );

  // 5. Initial Balanced Ledger Seed Postings (Double-entry Equilibrium)
  // Seed Sarah Connor Checking: $12,500.00 (1,250,000 cents)
  // Seed Sarah Connor Savings:  $45,000.00 (4,500,000 cents)
  // Seed John Doe Checking:     $8,200.00  (820,000 cents)
  // Seed John Doe Savings:      $15,000.00 (1,500,000 cents)
  const initialFundings = [
    { account: c1Checking, amountCents: 1250000, desc: "Initial Seed Capital - Sarah Checking" },
    { account: c1Savings, amountCents: 4500000, desc: "Initial Seed Capital - Sarah Savings" },
    { account: c2Checking, amountCents: 820000, desc: "Initial Seed Capital - John Checking" },
    { account: c2Savings, amountCents: 1500000, desc: "Initial Seed Capital - John Savings" },
  ];

  for (const funding of initialFundings) {
    await LedgerService.postJournalEntry({
      description: funding.desc,
      type: TransactionType.DEPOSIT_SIMULATION,
      currency: "USD",
      postings: [
        {
          ledgerAccountId: promoExpense._id as Types.ObjectId,
          direction: PostingDirection.DEBIT,
          amountCents: funding.amountCents,
          currency: "USD",
        },
        {
          ledgerAccountId: funding.account.ledgerAccountId,
          bankAccountId: funding.account._id as Types.ObjectId,
          direction: PostingDirection.CREDIT,
          amountCents: funding.amountCents,
          currency: "USD",
        },
      ],
    });

    funding.account.availableBalanceCents = funding.amountCents;
    funding.account.ledgerBalanceCents = funding.amountCents;
    await funding.account.save();

    await Notification.create({
      userId: funding.account.userId,
      title: "Account Credited",
      message: `Initial simulated funds of ${(funding.amountCents / 100).toFixed(2)} USD deposited to ${funding.account.accountNumber}.`,
      type: "TRANSACTION",
    });
  }

  // 6. Verify Initial Reconciliation
  for (const funding of initialFundings) {
    const rec = await LedgerService.reconcileAccount(funding.account._id);
    if (!rec.isBalanced) {
      throw new Error(`Reconciliation failure for ${funding.account.accountNumber}`);
    }
  }

  logger.info("VaultBank Database Seeded Successfully!");
  logger.info(`
  ================ DEMO ACCOUNTS ================
  ADMIN:      admin@vaultbank.test       | VaultAdmin123!
  COMPLIANCE: compliance@vaultbank.test  | VaultCompliance123!
  SUPPORT:    support@vaultbank.test     | VaultSupport123!
  CUSTOMER 1: customer1@vaultbank.test   | CustomerPass123!
              - Checking: ${c1Checking.accountNumber} ($12,500.00)
              - Savings:  ${c1Savings.accountNumber} ($45,000.00)
  CUSTOMER 2: customer2@vaultbank.test   | CustomerPass123!
              - Checking: ${c2Checking.accountNumber} ($8,200.00)
              - Savings:  ${c2Savings.accountNumber} ($15,000.00)
  ===============================================
  `);

  await disconnectDB();
}

runSeed().catch((err) => {
  console.error("Seed execution failed:", err);
  process.exit(1);
});

