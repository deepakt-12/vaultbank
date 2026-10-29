import { Types } from "mongoose";
import { AuditAction } from "@vaultbank/shared";
import { AuditEvent, IAuditEvent } from "../models/AuditEvent";
import { logger } from "../utils/logger";

export interface LogAuditOptions {
  userId?: string | Types.ObjectId;
  action: AuditAction;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export async function logAuditEvent(options: LogAuditOptions): Promise<IAuditEvent> {
  try {
    const event = await AuditEvent.create({
      userId: options.userId ? new Types.ObjectId(options.userId.toString()) : undefined,
      action: options.action,
      details: options.details || {},
      ipAddress: options.ipAddress || "system",
      userAgent: options.userAgent || "internal",
    });

    logger.info(
      {
        action: options.action,
        userId: options.userId,
        details: options.details,
      },
      `Audit Event: ${options.action}`
    );

    return event;
  } catch (err) {
    logger.error({ err, options }, "Failed to persist audit event");
    throw err;
  }
}

