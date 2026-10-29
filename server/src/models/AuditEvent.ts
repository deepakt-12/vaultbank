import mongoose, { Document, Schema, Types } from "mongoose";
import { AuditAction } from "@vaultbank/shared";

export interface IAuditEvent extends Document {
  userId?: Types.ObjectId;
  action: AuditAction;
  details: Record<string, unknown>;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
}

const AuditEventSchema = new Schema<IAuditEvent>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    action: {
      type: String,
      enum: Object.values(AuditAction),
      required: true,
      index: true,
    },
    details: { type: Schema.Types.Mixed, default: {} },
    ipAddress: { type: String, default: "unknown" },
    userAgent: { type: String, default: "unknown" },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Immutable
  }
);

AuditEventSchema.index({ createdAt: -1 });
AuditEventSchema.index({ userId: 1, createdAt: -1 });

export const AuditEvent = mongoose.model<IAuditEvent>("AuditEvent", AuditEventSchema);

