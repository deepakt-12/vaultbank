import { describe, it, expect } from "vitest";
import { Types } from "mongoose";
import { v4 as uuidv4 } from "uuid";
import { User } from "../src/models/User";
import { BankAccount } from "../src/models/BankAccount";
import { AccountService } from "../src/services/accountService";
import { TransferService } from "../src/services/transferService";

describe("Transfers, Idempotency & Financial Integrity Suite", () => {
  it("should execute transfer between accounts and maintain ledger equilibrium", async () => {
    const sender = await User.create({
      fullName: "Sender User",
      email: "sender@example.com",
      phoneNumber: "+14155551111",
      passwordHash: "hash",
      role: "CUSTOMER",
    });

    const recipient = await User.create({
      fullName: "Recipient User",
      email: "recipient@example.com",
      phoneNumber: "+14155552222",
      passwordHash: "hash",
      role: "CUSTOMER",
    });

    const senderAcc = await AccountService.createAccount(sender._id as Types.ObjectId, "CURRENT", "USD");
    const recipientAcc = await AccountService.createAccount(recipient._id as Types.ObjectId, "CURRENT", "USD");

    // Seed sender with $200.00 (20,000 cents)
    senderAcc.availableBalanceCents = 20000;
    senderAcc.ledgerBalanceCents = 20000;
    await senderAcc.save();

    const idempotencyKey = uuidv4();
    const result = await TransferService.executeInternalTransfer(sender._id, {
      idempotencyKey,
      sourceAccountId: senderAcc._id.toString(),
      destinationAccountNumber: recipientAcc.accountNumber,
      amountCents: 5000, // $50.00
      currency: "USD",
      description: "Dinner split",
    });

    expect(result.isIdempotentReplay).toBe(false);
    expect(result.transfer.amountCents).toBe(5000);
    expect(result.receiptNumber).toBeDefined();

    // Verify balances
    const updatedSender = await BankAccount.findById(senderAcc._id);
    const updatedRecipient = await BankAccount.findById(recipientAcc._id);

    expect(updatedSender?.availableBalanceCents).toBe(15000); // 20000 - 5000
    expect(updatedRecipient?.availableBalanceCents).toBe(5000);  // 0 + 5000
  });

  it("should reject transfer when sender has insufficient funds", async () => {
    const sender = await User.create({
      fullName: "Poor Sender",
      email: "poor@example.com",
      phoneNumber: "+14155553333",
      passwordHash: "hash",
      role: "CUSTOMER",
    });

    const recipient = await User.create({
      fullName: "Recipient 2",
      email: "rec2@example.com",
      phoneNumber: "+14155554444",
      passwordHash: "hash",
      role: "CUSTOMER",
    });

    const senderAcc = await AccountService.createAccount(sender._id as Types.ObjectId, "CURRENT", "USD");
    const recipientAcc = await AccountService.createAccount(recipient._id as Types.ObjectId, "CURRENT", "USD");

    // Sender balance is 0
    await expect(
      TransferService.executeInternalTransfer(sender._id, {
        idempotencyKey: uuidv4(),
        sourceAccountId: senderAcc._id.toString(),
        destinationAccountNumber: recipientAcc.accountNumber,
        amountCents: 5000,
        currency: "USD",
        description: "Overdraft attempt",
      })
    ).rejects.toThrow(/Insufficient funds/);
  });

  it("should replay previous transfer when duplicate idempotency key is submitted", async () => {
    const sender = await User.create({
      fullName: "Idempotent Sender",
      email: "idem@example.com",
      phoneNumber: "+14155555555",
      passwordHash: "hash",
      role: "CUSTOMER",
    });

    const recipient = await User.create({
      fullName: "Idempotent Recipient",
      email: "idemrec@example.com",
      phoneNumber: "+14155556666",
      passwordHash: "hash",
      role: "CUSTOMER",
    });

    const senderAcc = await AccountService.createAccount(sender._id as Types.ObjectId, "CURRENT", "USD");
    const recipientAcc = await AccountService.createAccount(recipient._id as Types.ObjectId, "CURRENT", "USD");

    senderAcc.availableBalanceCents = 100000;
    senderAcc.ledgerBalanceCents = 100000;
    await senderAcc.save();

    const idempotencyKey = uuidv4();
    const payload = {
      idempotencyKey,
      sourceAccountId: senderAcc._id.toString(),
      destinationAccountNumber: recipientAcc.accountNumber,
      amountCents: 10000,
      currency: "USD" as const,
      description: "Idempotency test",
    };

    // First call
    const res1 = await TransferService.executeInternalTransfer(sender._id, payload);
    expect(res1.isIdempotentReplay).toBe(false);

    // Second call with same idempotency key and same parameters
    const res2 = await TransferService.executeInternalTransfer(sender._id, payload);
    expect(res2.isIdempotentReplay).toBe(true);
    expect(res2.receiptNumber).toBe(res1.receiptNumber);

    // Verify balance was ONLY deducted once!
    const updatedSender = await BankAccount.findById(senderAcc._id);
    expect(updatedSender?.availableBalanceCents).toBe(90000); // 100000 - 10000 (NOT -20000)
  });

  it("should reject idempotency key reuse when payload differs (conflict)", async () => {
    const sender = await User.create({
      fullName: "Conflict Sender",
      email: "conflict@example.com",
      phoneNumber: "+14155557777",
      passwordHash: "hash",
      role: "CUSTOMER",
    });

    const recipient = await User.create({
      fullName: "Conflict Recipient",
      email: "confrec@example.com",
      phoneNumber: "+14155558888",
      passwordHash: "hash",
      role: "CUSTOMER",
    });

    const senderAcc = await AccountService.createAccount(sender._id as Types.ObjectId, "CURRENT", "USD");
    const recipientAcc = await AccountService.createAccount(recipient._id as Types.ObjectId, "CURRENT", "USD");

    senderAcc.availableBalanceCents = 100000;
    senderAcc.ledgerBalanceCents = 100000;
    await senderAcc.save();

    const idempotencyKey = uuidv4();
    await TransferService.executeInternalTransfer(sender._id, {
      idempotencyKey,
      sourceAccountId: senderAcc._id.toString(),
      destinationAccountNumber: recipientAcc.accountNumber,
      amountCents: 10000,
      currency: "USD",
      description: "Initial",
    });

    // Reuse key with DIFFERENT amount
    await expect(
      TransferService.executeInternalTransfer(sender._id, {
        idempotencyKey,
        sourceAccountId: senderAcc._id.toString(),
        destinationAccountNumber: recipientAcc.accountNumber,
        amountCents: 20000, // Differs!
        currency: "USD",
        description: "Tampered attempt",
      })
    ).rejects.toThrow(/Conflict: Idempotency key reused with differing request parameters/);
  });
});

