import { z } from "zod";

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

export const UserRole = {
  CUSTOMER: "CUSTOMER",
  SUPPORT: "SUPPORT",
  COMPLIANCE: "COMPLIANCE",
  ADMIN: "ADMIN",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const AccountType = {
  SAVINGS: "SAVINGS",
  CURRENT: "CURRENT",
} as const;
export type AccountType = (typeof AccountType)[keyof typeof AccountType];

export const AccountStatus = {
  ACTIVE: "ACTIVE",
  FROZEN: "FROZEN",
  CLOSED: "CLOSED",
  SUSPENDED: "SUSPENDED",
} as const;
export type AccountStatus = (typeof AccountStatus)[keyof typeof AccountStatus];

export const Currency = {
  USD: "USD",
  EUR: "EUR",
  GBP: "GBP",
  INR: "INR",
} as const;
export type Currency = (typeof Currency)[keyof typeof Currency];

export const TransactionType = {
  INTERNAL_TRANSFER: "INTERNAL_TRANSFER",
  DEPOSIT_SIMULATION: "DEPOSIT_SIMULATION",
  WITHDRAWAL_SIMULATION: "WITHDRAWAL_SIMULATION",
  FEE: "FEE",
  ADJUSTMENT: "ADJUSTMENT",
  REVERSAL: "REVERSAL",
} as const;
export type TransactionType = (typeof TransactionType)[keyof typeof TransactionType];

export const TransferStatus = {
  PENDING: "PENDING",
  POSTED: "POSTED",
  FAILED: "FAILED",
  REVERSED: "REVERSED",
} as const;
export type TransferStatus = (typeof TransferStatus)[keyof typeof TransferStatus];

export const LedgerAccountType = {
  ASSET: "ASSET",
  LIABILITY: "LIABILITY",
  EQUITY: "EQUITY",
  REVENUE: "REVENUE",
  EXPENSE: "EXPENSE",
} as const;
export type LedgerAccountType = (typeof LedgerAccountType)[keyof typeof LedgerAccountType];

export const PostingDirection = {
  DEBIT: "DEBIT",
  CREDIT: "CREDIT",
} as const;
export type PostingDirection = (typeof PostingDirection)[keyof typeof PostingDirection];

export const AuditAction = {
  AUTH_REGISTER: "AUTH_REGISTER",
  AUTH_LOGIN: "AUTH_LOGIN",
  AUTH_LOGOUT: "AUTH_LOGOUT",
  AUTH_LOGOUT_ALL: "AUTH_LOGOUT_ALL",
  AUTH_PASSWORD_RESET_REQUEST: "AUTH_PASSWORD_RESET_REQUEST",
  AUTH_PASSWORD_RESET_SUCCESS: "AUTH_PASSWORD_RESET_SUCCESS",
  AUTH_EMAIL_VERIFIED: "AUTH_EMAIL_VERIFIED",
  AUTH_MFA_ENABLED: "AUTH_MFA_ENABLED",
  AUTH_MFA_DISABLED: "AUTH_MFA_DISABLED",
  AUTH_FAILED_LOGIN: "AUTH_FAILED_LOGIN",
  TRANSFER_INITIATED: "TRANSFER_INITIATED",
  TRANSFER_POSTED: "TRANSFER_POSTED",
  TRANSFER_FAILED: "TRANSFER_FAILED",
  TRANSFER_CANCELLED: "TRANSFER_CANCELLED",
  TRANSFER_REVERSED: "TRANSFER_REVERSED",
  DEPOSIT_SIMULATED: "DEPOSIT_SIMULATED",
  WITHDRAWAL_SIMULATED: "WITHDRAWAL_SIMULATED",
  ADMIN_USER_STATUS_CHANGE: "ADMIN_USER_STATUS_CHANGE",
  ADMIN_ACCOUNT_STATUS_CHANGE: "ADMIN_ACCOUNT_STATUS_CHANGE",
  ADMIN_ADJUSTMENT_REQUESTED: "ADMIN_ADJUSTMENT_REQUESTED",
  ADMIN_ADJUSTMENT_APPROVED: "ADMIN_ADJUSTMENT_APPROVED",
  ADMIN_ADJUSTMENT_REJECTED: "ADMIN_ADJUSTMENT_REJECTED",
  SESSION_REVOKED: "SESSION_REVOKED",
} as const;
export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];

export const AdjustmentStatus = {
  PENDING_APPROVAL: "PENDING_APPROVAL",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const;
export type AdjustmentStatus = (typeof AdjustmentStatus)[keyof typeof AdjustmentStatus];

// ============================================================================
// FINANCIAL UTILITIES (INTEGER MINOR UNITS)
// All amounts are represented in integer minor units (cents, paise).
// No floating-point rounding errors in authoritative banking operations.
// ============================================================================

export function centsToDecimal(cents: number): string {
  const isNegative = cents < 0;
  const absCents = Math.abs(cents);
  const units = Math.floor(absCents / 100);
  const remainder = absCents % 100;
  const formatted = `${units}.${remainder.toString().padStart(2, "0")}`;
  return isNegative ? `-${formatted}` : formatted;
}

export function decimalToCents(amountStr: string | number): number {
  if (typeof amountStr === "number") {
    return Math.round(amountStr * 100);
  }
  const cleanStr = amountStr.trim().replace(/,/g, "");
  const parts = cleanStr.split(".");
  const units = parseInt(parts[0] || "0", 10);
  const decimals = (parts[1] || "").padEnd(2, "0").slice(0, 2);
  const sign = cleanStr.startsWith("-") ? -1 : 1;
  const absUnits = Math.abs(units);
  const cents = absUnits * 100 + parseInt(decimals, 10);
  return sign * cents;
}

export function formatCurrency(
  cents: number,
  currency: Currency = "USD",
  locale: string = "en-US"
): string {
  const decimalVal = cents / 100;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(decimalVal);
}

export function maskAccountNumber(accountNumber: string): string {
  if (!accountNumber || accountNumber.length < 4) return "****";
  const last4 = accountNumber.slice(-4);
  return `****-****-${last4}`;
}

export function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return "***@***.***";
  const [local, domain] = email.split("@");
  if (local.length <= 2) {
    return `${local[0]}*@${domain}`;
  }
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

// ============================================================================
// ZOD VALIDATION SCHEMAS
// ============================================================================

// Password security regex: at least 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters long")
  .max(128, "Password cannot exceed 128 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one digit")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

export const registerSchema = z.object({
  fullName: z.string().trim().min(2, "Full name must be at least 2 characters").max(100),
  email: z.string().trim().email("Invalid email address").toLowerCase(),
  phoneNumber: z
    .string()
    .trim()
    .regex(/^\+?[1-9]\d{6,14}$/, "Phone number must be a valid E.164 format (e.g. +14155552671)"),
  password: passwordSchema,
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().email("Invalid email address").toLowerCase(),
  password: z.string().min(1, "Password is required"),
  mfaCode: z.string().length(6, "MFA code must be 6 digits").optional(),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const verifyEmailSchema = z.object({
  token: z.string().min(16, "Verification token is invalid or expired"),
});
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Invalid email address").toLowerCase(),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(16, "Reset token is invalid or expired"),
  newPassword: passwordSchema,
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const mfaVerifySchema = z.object({
  code: z.string().regex(/^\d{6}$/, "TOTP code must be 6 digits"),
});
export type MfaVerifyInput = z.infer<typeof mfaVerifySchema>;

export const reauthenticateSchema = z.object({
  password: z.string().min(1, "Password is required"),
});
export type ReauthenticateInput = z.infer<typeof reauthenticateSchema>;

// Transfer Schemas
export const transferSchema = z.object({
  idempotencyKey: z
    .string()
    .uuid("Idempotency key must be a valid UUID v4")
    .or(z.string().min(16, "Idempotency key must be at least 16 characters")),
  sourceAccountId: z.string().min(1, "Source account is required"),
  destinationAccountNumber: z
    .string()
    .min(8, "Destination account number must be at least 8 characters")
    .max(34),
  amountCents: z
    .number()
    .int("Amount in minor units must be an integer")
    .positive("Transfer amount must be strictly positive")
    .max(1000000000, "Transfer amount exceeds maximum allowed ceiling"),
  currency: z.nativeEnum(Currency).default("USD"),
  description: z.string().trim().max(140).default("Transfer funds"),
  reauthPassword: z.string().optional(),
});
export type TransferInput = z.infer<typeof transferSchema>;

// Simulation Schemas (educational/portfolio funds)
export const simulationDepositSchema = z.object({
  idempotencyKey: z.string().min(16),
  accountId: z.string().min(1),
  amountCents: z.number().int().positive().max(50000000), // Max $500,000 for simulation
  description: z.string().trim().max(100).default("Simulated Deposit"),
});
export type SimulationDepositInput = z.infer<typeof simulationDepositSchema>;

export const simulationWithdrawalSchema = z.object({
  idempotencyKey: z.string().min(16),
  accountId: z.string().min(1),
  amountCents: z.number().int().positive().max(50000000),
  description: z.string().trim().max(100).default("Simulated Withdrawal"),
  reauthPassword: z.string().optional(),
});
export type SimulationWithdrawalInput = z.infer<typeof simulationWithdrawalSchema>;

// Account Management Schemas
export const createAccountSchema = z.object({
  accountType: z.nativeEnum(AccountType),
  currency: z.nativeEnum(Currency).default("USD"),
  nickname: z.string().trim().max(50).optional(),
});
export type CreateAccountInput = z.infer<typeof createAccountSchema>;

// Admin Schemas
export const adminAdjustmentRequestSchema = z.object({
  accountId: z.string().min(1),
  direction: z.nativeEnum(PostingDirection),
  amountCents: z.number().int().positive(),
  reasonCode: z.string().min(3).max(50),
  notes: z.string().min(10).max(500),
});
export type AdminAdjustmentRequestInput = z.infer<typeof adminAdjustmentRequestSchema>;

export const adminAdjustmentActionSchema = z.object({
  decision: z.enum(["APPROVE", "REJECT"]),
  reviewNotes: z.string().min(5).max(500),
});
export type AdminAdjustmentActionInput = z.infer<typeof adminAdjustmentActionSchema>;

export const userStatusUpdateSchema = z.object({
  status: z.enum(["ACTIVE", "LOCKED", "SUSPENDED"]),
  reason: z.string().min(5).max(300),
});
export type UserStatusUpdateInput = z.infer<typeof userStatusUpdateSchema>;

export const accountStatusUpdateSchema = z.object({
  status: z.nativeEnum(AccountStatus),
  reason: z.string().min(5).max(300),
});
export type AccountStatusUpdateInput = z.infer<typeof accountStatusUpdateSchema>;

