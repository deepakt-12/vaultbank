import mongoose, { Document, Schema, Types } from "mongoose";
import {
  Currency,
  LedgerAccountType,
  PostingDirection,
  TransactionType,
} from "@vaultbank/shared";

// ============================================================================
// 1. LEDGER ACCOUNT (CHART OF ACCOUNTS)
// ============================================================================
export interface ILedgerAccount extends Document {
  code: string;
  name: string;
  type: LedgerAccountType;
  normalBalance: PostingDirection;
  currency: Currency;
  isSystemAccount: boolean;
  bankAccountId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const LedgerAccountSchema = new Schema<ILedgerAccount>(
  {
    code: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: Object.values(LedgerAccountType),
      required: true,
      index: true,
    },
    normalBalance: {
      type: String,
      enum: Object.values(PostingDirection),
      required: true,
    },
    currency: {
      type: String,
      enum: Object.values(Currency),
      default: Currency.USD,
    },
    isSystemAccount: { type: Boolean, default: false },
    bankAccountId: { type: Schema.Types.ObjectId, ref: "BankAccount" },
  },
  {
    timestamps: true,
  }
);

export const LedgerAccount = mongoose.model<ILedgerAccount>(
  "LedgerAccount",
  LedgerAccountSchema
);

// ============================================================================
// 2. JOURNAL ENTRY (ATOMIC TRANSACTION ENVELOPE)
// ============================================================================
export interface IJournalEntry extends Document {
  reference: string;
  description: string;
  type: TransactionType;
  status: "POSTED" | "REVERSED";
  currency: Currency;
  totalAmountCents: number;
  reversalOfJournalId?: Types.ObjectId;
  metadata?: Record<string, unknown>;
  postedAt: Date;
  createdAt: Date;
}

const JournalEntrySchema = new Schema<IJournalEntry>(
  {
    reference: { type: String, required: true, unique: true, index: true },
    description: { type: String, required: true },
    type: {
      type: String,
      enum: Object.values(TransactionType),
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["POSTED", "REVERSED"],
      default: "POSTED",
      index: true,
    },
    currency: {
      type: String,
      enum: Object.values(Currency),
      required: true,
    },
    totalAmountCents: {
      type: Number,
      required: true,
      validate: {
        validator: (v: number) => Number.isInteger(v) && v > 0,
        message: "totalAmountCents must be a positive integer",
      },
    },
    reversalOfJournalId: { type: Schema.Types.ObjectId, ref: "JournalEntry" },
    metadata: { type: Schema.Types.Mixed },
    postedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

JournalEntrySchema.index({ createdAt: -1 });

export const JournalEntry = mongoose.model<IJournalEntry>(
  "JournalEntry",
  JournalEntrySchema
);

// ============================================================================
// 3. LEDGER POSTING (DOUBLE-ENTRY IMMUTABLE DEBIT/CREDIT LEGS)
// ============================================================================
export interface ILedgerPosting extends Document {
  journalEntryId: Types.ObjectId;
  ledgerAccountId: Types.ObjectId;
  bankAccountId?: Types.ObjectId;
  direction: PostingDirection;
  amountCents: number;
  currency: Currency;
  createdAt: Date;
}

const LedgerPostingSchema = new Schema<ILedgerPosting>(
  {
    journalEntryId: {
      type: Schema.Types.ObjectId,
      ref: "JournalEntry",
      required: true,
      index: true,
    },
    ledgerAccountId: {
      type: Schema.Types.ObjectId,
      ref: "LedgerAccount",
      required: true,
      index: true,
    },
    bankAccountId: {
      type: Schema.Types.ObjectId,
      ref: "BankAccount",
      index: true,
    },
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
    currency: {
      type: String,
      enum: Object.values(Currency),
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Immutable: no updatedAt
  }
);

LedgerPostingSchema.index({ bankAccountId: 1, createdAt: -1 });
LedgerPostingSchema.index({ ledgerAccountId: 1, createdAt: -1 });

export const LedgerPosting = mongoose.model<ILedgerPosting>(
  "LedgerPosting",
  LedgerPostingSchema
);

