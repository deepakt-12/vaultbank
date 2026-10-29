import { NextFunction, Request, Response } from "express";
import { logger } from "../utils/logger";
import { env } from "../config/env";

export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public details?: unknown;

  constructor(message: string, statusCode: number = 400, code: string = "BAD_REQUEST", details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const errorCode = err instanceof AppError ? err.code : "INTERNAL_SERVER_ERROR";
  const message =
    statusCode === 500 && env.NODE_ENV === "production"
      ? "An internal banking system error occurred. Please try again later."
      : err.message;

  logger.error(
    {
      err: {
        message: err.message,
        name: err.name,
        stack: env.NODE_ENV !== "production" ? err.stack : undefined,
      },
      path: req.path,
      method: req.method,
      ip: req.ip,
      statusCode,
      errorCode,
    },
    `Unhandled or Operational Error: ${err.message}`
  );

  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message,
      ...(err instanceof AppError && err.details ? { details: err.details } : {}),
    },
  });
}

