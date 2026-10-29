import { NextFunction, Request, Response } from "express";
import { UserRole } from "@vaultbank/shared";
import { IUser, User } from "../models/User";
import { ISession, Session } from "../models/Session";
import { env } from "../config/env";
import { AppError } from "./errorHandler";
import { verifyPassword } from "../utils/crypto";

// Extend Express Request declaration
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: IUser;
      sessionDoc?: ISession;
    }
  }
}

export async function sessionMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const sessionId = req.cookies[env.SESSION_NAME];

  if (!sessionId) {
    return next();
  }

  try {
    const session = await Session.findOne({
      sessionId,
      isValid: true,
      expiresAt: { $gt: new Date() },
    });

    if (!session) {
      // Clear stale cookie
      res.clearCookie(env.SESSION_NAME);
      return next();
    }

    const user = await User.findById(session.userId);

    if (!user || user.status !== "ACTIVE") {
      // Invalidate session if user account is locked or deleted
      session.isValid = false;
      await session.save();
      res.clearCookie(env.SESSION_NAME);
      return next();
    }

    // Update active timestamp asynchronously without blocking
    session.lastActiveAt = new Date();
    session.save().catch(() => {});

    req.sessionDoc = session;
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.user || !req.sessionDoc) {
    throw new AppError("Authentication required. Please sign in.", 401, "UNAUTHORIZED");
  }
  next();
}

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError("Authentication required.", 401, "UNAUTHORIZED");
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new AppError(
        "Forbidden: You do not possess the required permissions to access this financial resource.",
        403,
        "FORBIDDEN"
      );
    }
    next();
  };
}

export async function verifyReauth(user: IUser, password?: string): Promise<boolean> {
  if (!password) return false;
  const userWithPassword = await User.findById(user._id).select("+passwordHash");
  if (!userWithPassword) return false;
  return await verifyPassword(userWithPassword.passwordHash, password);
}

