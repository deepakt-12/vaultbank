import argon2 from "argon2";
import crypto from "crypto";
import { env } from "../config/env";

export async function hashPassword(plainText: string): Promise<string> {
  return argon2.hash(plainText, {
    type: argon2.argon2id,
    timeCost: env.ARGON2_TIME_COST,
    memoryCost: env.ARGON2_MEMORY_COST,
    parallelism: env.ARGON2_PARALLELISM,
  });
}

export async function verifyPassword(hash: string, plainText: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plainText);
  } catch {
    return false;
  }
}

export function generateSecureToken(bytes: number = 32): string {
  return crypto.randomBytes(bytes).toString("hex");
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function generateFingerprint(data: unknown): string {
  const jsonStr = JSON.stringify(data, Object.keys(data as object).sort());
  return crypto.createHash("sha256").update(jsonStr).digest("hex");
}

export function generateAccountNumber(prefix: string = "VB"): string {
  // Generates realistic ISO/IBAN-like account number
  // Format: VB + 10 random numeric digits
  const randomDigits = crypto.randomInt(1000000000, 9999999999).toString();
  return `${prefix}${randomDigits}`;
}

