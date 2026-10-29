import { authenticator } from "otplib";
import qrcode from "qrcode";
import { Types } from "mongoose";
import {
  AuditAction,
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  UserRole,
} from "@vaultbank/shared";
import { IUser, User } from "../models/User";
import { ISession, Session } from "../models/Session";
import { PasswordResetToken, VerificationToken } from "../models/Token";
import {
  generateSecureToken,
  hashPassword,
  hashToken,
  verifyPassword,
} from "../utils/crypto";
import { AppError } from "../middleware/errorHandler";
import { logAuditEvent } from "./auditService";
import { AccountService } from "./accountService";
import { env } from "../config/env";
import { logger } from "../utils/logger";

export class AuthService {
  /**
   * Registers a new customer, sets up an initial primary account,
   * and creates an email verification token.
   */
  public static async register(
    input: RegisterInput,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ user: IUser; verificationToken: string }> {
    const existing = await User.findOne({ email: input.email.toLowerCase() });
    if (existing) {
      // Security: Throw generic error or standard conflict
      throw new AppError("An account with this email address already exists.", 409, "USER_EXISTS");
    }

    const passwordHash = await hashPassword(input.password);

    const user = await User.create({
      fullName: input.fullName,
      email: input.email.toLowerCase(),
      phoneNumber: input.phoneNumber,
      passwordHash,
      role: UserRole.CUSTOMER,
      status: "ACTIVE",
      isEmailVerified: false,
    });

    // Automatically provision initial checking and savings accounts
    await AccountService.createAccount(user._id as Types.ObjectId, "CURRENT", "USD", "Primary Checking");
    await AccountService.createAccount(user._id as Types.ObjectId, "SAVINGS", "USD", "High-Yield Savings");

    // Generate single-use verification token
    const rawToken = generateSecureToken(32);
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await VerificationToken.create({
      userId: user._id,
      tokenHash,
      expiresAt,
      used: false,
    });

    await logAuditEvent({
      userId: user._id as Types.ObjectId,
      action: AuditAction.AUTH_REGISTER,
      details: { email: user.email, role: user.role },
      ipAddress,
      userAgent,
    });

    return { user, verificationToken: rawToken };
  }

  /**
   * Authenticates user credentials with progressive lockout and optional MFA.
   */
  public static async login(
    input: LoginInput,
    ipAddress: string = "unknown",
    userAgent: string = "unknown"
  ): Promise<{
    user: IUser;
    session: ISession;
    requiresMfa: boolean;
  }> {
    const user = await User.findOne({ email: input.email.toLowerCase() }).select(
      "+passwordHash +mfaSecret +backupCodes"
    );

    if (!user) {
      // Timing-attack prevention: perform dummy verification
      await hashPassword("dummy-password-to-equalize-timing");
      throw new AppError("Invalid email or password.", 401, "INVALID_CREDENTIALS");
    }

    // Check account lockout status
    if (user.lockoutUntil && user.lockoutUntil > new Date()) {
      const waitMinutes = Math.ceil((user.lockoutUntil.getTime() - Date.now()) / 60000);
      throw new AppError(
        `Account temporarily locked due to repeated failed logins. Please try again in ${waitMinutes} minutes.`,
        403,
        "ACCOUNT_LOCKED"
      );
    }

    if (user.status !== "ACTIVE") {
      throw new AppError(`Account is ${user.status}. Please contact support.`, 403, "ACCOUNT_INACTIVE");
    }

    const isValidPassword = await verifyPassword(user.passwordHash, input.password);

    if (!isValidPassword) {
      user.failedLoginAttempts += 1;
      if (user.failedLoginAttempts >= 5) {
        user.lockoutUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 mins lock
        logger.warn({ email: user.email, ip: ipAddress }, "Account locked after repeated failed logins");
      }
      await user.save();

      await logAuditEvent({
        userId: user._id as Types.ObjectId,
        action: AuditAction.AUTH_FAILED_LOGIN,
        details: { attempts: user.failedLoginAttempts },
        ipAddress,
        userAgent,
      });

      throw new AppError("Invalid email or password.", 401, "INVALID_CREDENTIALS");
    }

    // MFA Check
    if (user.mfaEnabled) {
      if (!input.mfaCode) {
        return {
          user,
          session: null as unknown as ISession,
          requiresMfa: true,
        };
      }

      // Verify TOTP or backup code
      let isMfaValid = false;
      if (user.mfaSecret) {
        isMfaValid = authenticator.verify({
          token: input.mfaCode,
          secret: user.mfaSecret,
        });
      }

      // If TOTP failed, check backup codes
      if (!isMfaValid && user.backupCodes && user.backupCodes.length > 0) {
        const inputHash = hashToken(input.mfaCode);
        const codeIndex = user.backupCodes.findIndex((b) => b.codeHash === inputHash && !b.used);
        if (codeIndex !== -1) {
          user.backupCodes[codeIndex].used = true;
          user.backupCodes[codeIndex].usedAt = new Date();
          isMfaValid = true;
        }
      }

      if (!isMfaValid) {
        throw new AppError("Invalid multi-factor authentication code.", 401, "INVALID_MFA");
      }
    }

    // Reset failed login counter upon successful authentication
    user.failedLoginAttempts = 0;
    user.lockoutUntil = null;
    user.lastLoginAt = new Date();
    await user.save();

    // Create opaque persistent session
    const sessionId = generateSecureToken(32);
    const expiresAt = new Date(Date.now() + env.SESSION_MAX_AGE_MS);

    const session = await Session.create({
      sessionId,
      userId: user._id,
      userAgent,
      ipAddress,
      expiresAt,
      isValid: true,
    });

    await logAuditEvent({
      userId: user._id as Types.ObjectId,
      action: AuditAction.AUTH_LOGIN,
      details: { sessionId: session._id },
      ipAddress,
      userAgent,
    });

    return {
      user,
      session,
      requiresMfa: false,
    };
  }

  /**
   * Invalidates a specific session
   */
  public static async logout(sessionId: string, userId?: string | Types.ObjectId): Promise<void> {
    await Session.updateOne({ sessionId }, { isValid: false });
    if (userId) {
      await logAuditEvent({
        userId: new Types.ObjectId(userId.toString()),
        action: AuditAction.AUTH_LOGOUT,
        details: { sessionId },
      });
    }
  }

  /**
   * Invalidates all active sessions for a user (Security reset)
   */
  public static async logoutAll(userId: string | Types.ObjectId): Promise<void> {
    const userObjId = new Types.ObjectId(userId.toString());
    await Session.updateMany({ userId: userObjId, isValid: true }, { isValid: false });
    await logAuditEvent({
      userId: userObjId,
      action: AuditAction.AUTH_LOGOUT_ALL,
    });
  }

  /**
   * Verifies email using single-use token
   */
  public static async verifyEmail(token: string): Promise<boolean> {
    const tokenHash = hashToken(token);
    const record = await VerificationToken.findOne({
      tokenHash,
      used: false,
      expiresAt: { $gt: new Date() },
    });

    if (!record) {
      throw new AppError("Verification token is invalid or has expired.", 400);
    }

    record.used = true;
    await record.save();

    await User.updateOne({ _id: record.userId }, { isEmailVerified: true });
    await logAuditEvent({
      userId: record.userId,
      action: AuditAction.AUTH_EMAIL_VERIFIED,
    });

    return true;
  }

  /**
   * Initiates password reset request
   */
  public static async requestPasswordReset(
    input: ForgotPasswordInput,
    ipAddress?: string,
    userAgent?: string
  ): Promise<string | null> {
    const user = await User.findOne({ email: input.email.toLowerCase() });
    if (!user) {
      // Do not disclose whether email exists
      return null;
    }

    const rawToken = generateSecureToken(32);
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await PasswordResetToken.create({
      userId: user._id,
      tokenHash,
      expiresAt,
      used: false,
    });

    await logAuditEvent({
      userId: user._id as Types.ObjectId,
      action: AuditAction.AUTH_PASSWORD_RESET_REQUEST,
      ipAddress,
      userAgent,
    });

    return rawToken;
  }

  /**
   * Completes password reset using single-use token
   */
  public static async resetPassword(input: ResetPasswordInput): Promise<boolean> {
    const tokenHash = hashToken(input.token);
    const record = await PasswordResetToken.findOne({
      tokenHash,
      used: false,
      expiresAt: { $gt: new Date() },
    });

    if (!record) {
      throw new AppError("Password reset token is invalid or has expired.", 400);
    }

    record.used = true;
    await record.save();

    const newPasswordHash = await hashPassword(input.newPassword);
    await User.updateOne({ _id: record.userId }, { passwordHash: newPasswordHash });

    // Revoke all existing sessions for security
    await Session.updateMany({ userId: record.userId }, { isValid: false });

    await logAuditEvent({
      userId: record.userId,
      action: AuditAction.AUTH_PASSWORD_RESET_SUCCESS,
    });

    return true;
  }

  /**
   * Generates TOTP setup secret, QR code data URL, and backup codes
   */
  public static async generateMfaSetup(user: IUser): Promise<{
    secret: string;
    qrCodeUrl: string;
    backupCodes: string[];
  }> {
    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(user.email, env.MFA_APP_NAME, secret);
    const qrCodeUrl = await qrcode.toDataURL(otpauth);

    // Generate 8 high-entropy 8-digit backup codes
    const backupCodes: string[] = [];
    const hashedBackupCodes = [];
    for (let i = 0; i < 8; i++) {
      const code = generateSecureToken(4).toUpperCase();
      backupCodes.push(code);
      hashedBackupCodes.push({ codeHash: hashToken(code), used: false });
    }

    // Save temporary secret to user (not enabled until verified)
    const userDoc = await User.findById(user._id);
    if (userDoc) {
      userDoc.mfaSecret = secret;
      userDoc.backupCodes = hashedBackupCodes;
      await userDoc.save();
    }

    return { secret, qrCodeUrl, backupCodes };
  }

  /**
   * Verifies initial TOTP code to confirm and enable MFA
   */
  public static async confirmMfa(user: IUser, token: string): Promise<boolean> {
    const userDoc = await User.findById(user._id).select("+mfaSecret");
    if (!userDoc || !userDoc.mfaSecret) {
      throw new AppError("MFA setup not initialized.", 400);
    }

    const isValid = authenticator.verify({
      token,
      secret: userDoc.mfaSecret,
    });

    if (!isValid) {
      throw new AppError("Invalid verification code. Please check your authenticator app.", 400);
    }

    userDoc.mfaEnabled = true;
    await userDoc.save();

    await logAuditEvent({
      userId: userDoc._id as Types.ObjectId,
      action: AuditAction.AUTH_MFA_ENABLED,
    });

    return true;
  }
}

