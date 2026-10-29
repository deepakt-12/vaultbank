import { CookieOptions, Request, Response } from "express";
import { AuthService } from "../services/authService";
import { env } from "../config/env";
import { Session } from "../models/Session";
import { AppError } from "../middleware/errorHandler";

const cookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: env.COOKIE_SAME_SITE,
  maxAge: env.SESSION_MAX_AGE_MS,
  path: "/",
};

export class AuthController {
  public static async register(req: Request, res: Response): Promise<void> {
    const { user, verificationToken } = await AuthService.register(
      req.body,
      req.ip,
      req.headers["user-agent"]
    );

    res.status(201).json({
      success: true,
      data: {
        user,
        message:
          "Registration successful. Please verify your email with the verification token provided.",
        verificationToken, // Provided directly for educational/testing convenience
      },
    });
  }

  public static async login(req: Request, res: Response): Promise<void> {
    const result = await AuthService.login(
      req.body,
      req.ip,
      req.headers["user-agent"]
    );

    if (result.requiresMfa) {
      res.status(200).json({
        success: true,
        data: {
          requiresMfa: true,
          message: "MFA code required to complete authentication.",
        },
      });
      return;
    }

    // Set secure session cookie
    res.cookie(env.SESSION_NAME, result.session.sessionId, cookieOptions);

    res.status(200).json({
      success: true,
      data: {
        user: result.user,
        requiresMfa: false,
        message: "Authentication successful.",
      },
    });
  }

  public static async logout(req: Request, res: Response): Promise<void> {
    if (req.sessionDoc) {
      await AuthService.logout(req.sessionDoc.sessionId, req.user?._id);
    }
    res.clearCookie(env.SESSION_NAME);
    res.status(200).json({
      success: true,
      data: { message: "Successfully logged out." },
    });
  }

  public static async logoutAll(req: Request, res: Response): Promise<void> {
    if (req.user) {
      await AuthService.logoutAll(req.user._id);
    }
    res.clearCookie(env.SESSION_NAME);
    res.status(200).json({
      success: true,
      data: { message: "All active sessions have been revoked." },
    });
  }

  public static async verifyEmail(req: Request, res: Response): Promise<void> {
    await AuthService.verifyEmail(req.body.token);
    res.status(200).json({
      success: true,
      data: { message: "Email address verified successfully." },
    });
  }

  public static async forgotPassword(req: Request, res: Response): Promise<void> {
    const resetToken = await AuthService.requestPasswordReset(
      req.body,
      req.ip,
      req.headers["user-agent"]
    );

    res.status(200).json({
      success: true,
      data: {
        message:
          "If an account with that email exists, password reset instructions have been dispatched.",
        resetToken: env.NODE_ENV !== "production" ? resetToken : undefined,
      },
    });
  }

  public static async resetPassword(req: Request, res: Response): Promise<void> {
    await AuthService.resetPassword(req.body);
    res.clearCookie(env.SESSION_NAME);
    res.status(200).json({
      success: true,
      data: {
        message: "Password reset successful. All active sessions have been revoked. Please sign in.",
      },
    });
  }

  public static async getSessions(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AppError("Unauthorized", 401);

    const sessions = await Session.find({
      userId: req.user._id,
      isValid: true,
      expiresAt: { $gt: new Date() },
    }).sort({ lastActiveAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        sessions: sessions.map((s) => ({
          id: s._id,
          isCurrent: s.sessionId === req.sessionDoc?.sessionId,
          userAgent: s.userAgent,
          ipAddress: s.ipAddress,
          lastActiveAt: s.lastActiveAt,
          createdAt: s.createdAt,
        })),
      },
    });
  }

  public static async revokeSession(req: Request, res: Response): Promise<void> {
    const { sessionId } = req.params;
    if (!req.user) throw new AppError("Unauthorized", 401);

    await Session.updateOne({ _id: sessionId, userId: req.user._id }, { isValid: false });

    res.status(200).json({
      success: true,
      data: { message: "Session revoked successfully." },
    });
  }

  public static async mfaSetup(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AppError("Unauthorized", 401);
    const mfaData = await AuthService.generateMfaSetup(req.user);

    res.status(200).json({
      success: true,
      data: mfaData,
    });
  }

  public static async mfaVerify(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new AppError("Unauthorized", 401);
    await AuthService.confirmMfa(req.user, req.body.code);

    res.status(200).json({
      success: true,
      data: { message: "Two-factor authentication enabled successfully." },
    });
  }
}

