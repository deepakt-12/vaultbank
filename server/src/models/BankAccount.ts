import mongoose, { Document, Schema, Types } from "mongoose";
import { AccountStatus, AccountType, Currency } from "@vaultbank/shared";

export interface IBankAccount extends Document {
  accountNumber: string;
  userId: Types.ObjectId;
  accountType: AccountType;
  currency: Currency;
  availableBalanceCents: number;
  ledgerBalanceCents: number;
  status: AccountStatus;
  nickname?: string;
  ledgerAccountId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const BankAccountSchema = new Schema<IBankAccount>(
  {
    accountNumber: { type: String, required: true, unique: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    accountType: {
      type: String,
      enum: Object.values(AccountType),
      required: true,
    },
    currency: {
      type: String,
      enum: Object.values(Currency),
      default: Currency.USD,
    },
    availableBalanceCents: {
      type: Number,
      required: true,
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: "availableBalanceCents must be an integer (minor units)",
      },
    },
    ledgerBalanceCents: {
      type: Number,
      required: true,
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: "ledgerBalanceCents must be an integer (minor units)",
      },
    },
    status: {
      type: String,
      enum: Object.values(AccountStatus),
      default: AccountStatus.ACTIVE,
      index: true,
    },
    nickname: { type: String, trim: true },
    ledgerAccountId: { type: Schema.Types.ObjectId, ref: "LedgerAccount", required: true },
  },
  {
    timestamps: true,
  }
);

BankAccountSchema.index({ userId: 1, status: 1 });
BankAccountSchema.index({ accountNumber: 1, status: 1 });

export const BankAccount = mongoose.model<IBankAccount>("BankAccount", BankAccountSchema);

