import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../src/app";
import { User } from "../src/models/User";
import { Session } from "../src/models/Session";
import { VerificationToken } from "../src/models/Token";

describe("Authentication & Account Security Suite", () => {
  const validUser = {
    fullName: "Alice Vance",
    email: "alice@example.com",
    phoneNumber: "+14155551234",
    password: "Password123!",
  };

  it("should successfully register a customer and hash the password", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send(validUser);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe("alice@example.com");
    expect(res.body.data.user.passwordHash).toBeUndefined(); // Stripped

    const dbUser = await User.findOne({ email: "alice@example.com" });
    expect(dbUser).toBeDefined();
    expect(dbUser?.passwordHash).not.toBe(validUser.password); // Hashed
    expect(dbUser?.passwordHash.startsWith("$argon2id")).toBe(true);
  });

  it("should reject registration with duplicate email", async () => {
    await request(app).post("/api/v1/auth/register").send(validUser);
    const res = await request(app).post("/api/v1/auth/register").send(validUser);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it("should reject weak password during registration", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ ...validUser, email: "weak@example.com", password: "123" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("should successfully log in and set an HttpOnly session cookie", async () => {
    await request(app).post("/api/v1/auth/register").send(validUser);

    const res = await request(app).post("/api/v1/auth/login").send({
      email: validUser.email,
      password: validUser.password,
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const cookies = res.headers["set-cookie"] as string[];
    expect(cookies).toBeDefined();
    const sessionCookie = cookies.find((c) => c.includes("vaultbank.sid="));
    expect(sessionCookie).toBeDefined();
    expect(sessionCookie).toContain("HttpOnly");
  });

  it("should enforce progressive lockout after 5 consecutive failed logins", async () => {
    await request(app).post("/api/v1/auth/register").send(validUser);

    for (let i = 0; i < 5; i++) {
      const failRes = await request(app).post("/api/v1/auth/login").send({
        email: validUser.email,
        password: "WrongPassword!",
      });
      expect(failRes.status).toBe(401);
    }

    // 6th attempt should be blocked with 403 ACCOUNT_LOCKED
    const lockedRes = await request(app).post("/api/v1/auth/login").send({
      email: validUser.email,
      password: validUser.password, // Even with correct password!
    });

    expect(lockedRes.status).toBe(403);
    expect(lockedRes.body.error.code).toBe("ACCOUNT_LOCKED");
  });

  it("should verify email using single-use token", async () => {
    const regRes = await request(app).post("/api/v1/auth/register").send(validUser);
    const rawToken = regRes.body.data.verificationToken;

    const verifyRes = await request(app)
      .post("/api/v1/auth/verify-email")
      .send({ token: rawToken });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.success).toBe(true);

    const updatedUser = await User.findOne({ email: validUser.email });
    expect(updatedUser?.isEmailVerified).toBe(true);

    // Reuse of the same token must fail
    const reuseRes = await request(app)
      .post("/api/v1/auth/verify-email")
      .send({ token: rawToken });
    expect(reuseRes.status).toBe(400);
  });
});

