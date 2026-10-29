import mongoose, { Document, Schema, Types } from "mongoose";
import { Currency, TransferStatus } from "@vaultbank/shared";

export interface ITransfer extends Document {
  transferId: string;
  idempotencyKey: string;
  sourceAccountId: Types.ObjectId;
  sourceUserId: Types.ObjectId;
  destinationAccountId: Types.ObjectId;
  destinationUserId: Types.ObjectId;
  amountCents: number;
  currency: Currency;
  status: TransferStatus;
  journalEntryId?: Types.ObjectId;
  description: string;
  receiptNumber: string;
  riskScore: number;
  failureReason?: string;
  reversedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TransferSchema = new Schema<ITransfer>(
  {
    transferId: { type: String, required: true, unique: true, index: true },
    idempotencyKey: { type: String, required: true, index: true },
    sourceAccountId: { type: Schema.Types.ObjectId, ref: "BankAccount", required: true, index: true },
    sourceUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    destinationAccountId: { type: Schema.Types.ObjectId, ref: "BankAccount", required: true, index: true },
    destinationUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    amountCents: {
      type: Number,
      required: true,
      validate: {
        validator: (v: number) => Number.isInteger(v) && v > 0,
        message: "amountCents must be a positive integer",
      },
    },
    currency: {
      type: String,
      enum: Object.values(Currency),
      default: Currency.USD,
    },
    status: {
      type: String,
      enum: Object.values(TransferStatus),
      default: TransferStatus.PENDING,
      index: true,
    },
    journalEntryId: { type: Schema.Types.ObjectId, ref: "JournalEntry" },
    description: { type: String, default: "Transfer funds" },
    receiptNumber: { type: String, required: true, unique: true },
    riskScore: { type: Number, default: 0 },
    failureReason: { type: String },
    reversedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

TransferSchema.index({ sourceAccountId: 1, createdAt: -1 });
TransferSchema.index({ destinationAccountId: 1, createdAt: -1 });
TransferSchema.index({ idempotencyKey: 1, sourceAccountId: 1 }, { unique: true });

export const Transfer = mongoose.model<ITransfer>("Transfer", TransferSchema);

