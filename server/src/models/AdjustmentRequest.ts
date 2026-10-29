import mongoose, { Document, Schema, Types } from "mongoose";
import { AdjustmentStatus, PostingDirection } from "@vaultbank/shared";

export interface IAdjustmentRequest extends Document {
  accountId: Types.ObjectId;
  direction: PostingDirection;
  amountCents: number;
  reasonCode: string;
  notes: string;
  requestedBy: Types.ObjectId;
  status: AdjustmentStatus;
  reviewedBy?: Types.ObjectId;
  reviewNotes?: string;
  journalEntryId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AdjustmentRequestSchema = new Schema<IAdjustmentRequest>(
  {
    accountId: { type: Schema.Types.ObjectId, ref: "BankAccount", required: true, index: true },
    direction: {
      type: String,
      enum: Object.values(PostingDirection),
      required: true,
    },
    amountCents: {
      type: Number,
      required: true,
      validate: {
        validator: (v: number) => Number.isInteger(v) && v > 0,
        message: "amountCents must be a positive integer",
      },
    },
    reasonCode: { type: String, required: true },
    notes: { type: String, required: true },
    requestedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: Object.values(AdjustmentStatus),
      default: AdjustmentStatus.PENDING_APPROVAL,
      index: true,
    },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewNotes: { type: String },
    journalEntryId: { type: Schema.Types.ObjectId, ref: "JournalEntry" },
  },
  {
    timestamps: true,
  }
);

export const AdjustmentRequest = mongoose.model<IAdjustmentRequest>(
  "AdjustmentRequest",
  AdjustmentRequestSchema
);

