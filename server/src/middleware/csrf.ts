import { NextFunction, Request, Response } from "express";
import { AppError } from "./errorHandler";
import { generateSecureToken } from "../utils/crypto";

export const CSRF_COOKIE_NAME = "vaultbank.csrf";

export function ensureCsrfCookie(req: Request, res: Response, next: NextFunction): void {
  let csrfToken = req.cookies[CSRF_COOKIE_NAME];
  if (!csrfToken) {
    csrfToken = generateSecureToken(16);
    res.cookie(CSRF_COOKIE_NAME, csrfToken, {
      httpOnly: false, // Accessible by JavaScript client to read and send in header
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 86400000,
    });
  }
  next();
}

export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  // Safe methods do not mutate state
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }

  // Exempt auth bootstrap endpoints if session doesn't exist yet
  // e.g. login, register, forgot-password
  if (
    req.path.startsWith("/api/v1/auth/login") ||
    req.path.startsWith("/api/v1/auth/register") ||
    req.path.startsWith("/api/v1/auth/verify-email") ||
    req.path.startsWith("/api/v1/auth/forgot-password") ||
    req.path.startsWith("/api/v1/auth/reset-password")
  ) {
    return next();
  }

  const clientToken = req.headers["x-vaultbank-csrf"] as string;
  const expectedToken = req.cookies[CSRF_COOKIE_NAME];

  if (!clientToken || !expectedToken || clientToken !== expectedToken) {
    throw new AppError(
      "CSRF token validation failed. State-changing requests must include a valid X-VaultBank-CSRF header.",
      403,
      "CSRF_INVALID"
    );
  }

  next();
}

