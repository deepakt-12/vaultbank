import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../src/app";
import { User } from "../src/models/User";
import { Session } from "../src/models/Session";
import { BankAccount } from "../src/models/BankAccount";
import { AccountService } from "../src/services/accountService";
import { AdjustmentRequest } from "../src/models/AdjustmentRequest";
import { Types } from "mongoose";

describe("Role Authorization, Maker-Checker & CSRF Security Suite", () => {
  it("should forbid normal customer from accessing administrative endpoints", async () => {
    const customer = await User.create({
      fullName: "Ordinary Customer",
      email: "ordinary@example.com",
      phoneNumber: "+14155559991",
      passwordHash: "hash",
      role: "CUSTOMER",
    });

    const session = await Session.create({
      sessionId: "cust-session-token",
      userId: customer._id,
      isValid: true,
      expiresAt: new Date(Date.now() + 86400000),
    });

    const res = await request(app)
      .get("/api/v1/admin/users")
      .set("Cookie", [`vaultbank.sid=${session.sessionId}`]);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("should enforce Maker-Checker policy: Maker cannot approve their own adjustment", async () => {
    const admin = await User.create({
      fullName: "Admin Officer",
      email: "admin_mc@vaultbank.test",
      phoneNumber: "+14155559992",
      passwordHash: "hash",
      role: "ADMIN",
    });

    const session = await Session.create({
      sessionId: "admin-session-token",
      userId: admin._id,
      isValid: true,
      expiresAt: new Date(Date.now() + 86400000),
    });

    const targetAccount = await AccountService.createAccount(
      admin._id as Types.ObjectId,
      "CURRENT",
      "USD"
    );

    // Admin creates adjustment request (as Maker)
    const adjustment = await AdjustmentRequest.create({
      accountId: targetAccount._id,
      direction: "CREDIT",
      amountCents: 50000,
      reasonCode: "REBATE",
      notes: "Customer fee rebate",
      requestedBy: admin._id,
    });

    // Same Admin attempts to approve their own adjustment (as Checker)
    const res = await request(app)
      .post(`/api/v1/admin/adjustments/${adjustment._id}/review`)
      .set("Cookie", [`vaultbank.sid=${session.sessionId}`, "vaultbank.csrf=test-csrf"])
      .set("X-VaultBank-CSRF", "test-csrf")
      .send({
        decision: "APPROVE",
        reviewNotes: "Self-approving my own adjustment",
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("MAKER_CHECKER_VIOLATION");
  });

  it("should reject state-changing requests when CSRF token is missing", async () => {
    const user = await User.create({
      fullName: "CSRF Target",
      email: "csrf@example.com",
      phoneNumber: "+14155559993",
      passwordHash: "hash",
      role: "CUSTOMER",
    });

    const session = await Session.create({
      sessionId: "csrf-session-token",
      userId: user._id,
      isValid: true,
      expiresAt: new Date(Date.now() + 86400000),
    });

    // Mutating request without X-VaultBank-CSRF header
    const res = await request(app)
      .post("/api/v1/accounts")
      .set("Cookie", [`vaultbank.sid=${session.sessionId}`, "vaultbank.csrf=cookie-token-abc"])
      // Intentionally omitting X-VaultBank-CSRF header
      .send({
        accountType: "SAVINGS",
        currency: "USD",
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("CSRF_INVALID");
  });
});

