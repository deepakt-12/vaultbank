import mongoose, { Document, Schema } from "mongoose";
import { UserRole } from "@vaultbank/shared";

export interface IBackupCode {
  codeHash: string;
  used: boolean;
  usedAt?: Date;
}

export interface IUser extends Document {
  fullName: string;
  email: string;
  phoneNumber: string;
  passwordHash: string;
  role: UserRole;
  status: "ACTIVE" | "LOCKED" | "SUSPENDED";
  isEmailVerified: boolean;
  failedLoginAttempts: number;
  lockoutUntil: Date | null;
  mfaEnabled: boolean;
  mfaSecret?: string;
  backupCodes: IBackupCode[];
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const BackupCodeSchema = new Schema<IBackupCode>(
  {
    codeHash: { type: String, required: true },
    used: { type: Boolean, default: false },
    usedAt: { type: Date },
  },
  { _id: false }
);

const UserSchema = new Schema<IUser>(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    phoneNumber: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.CUSTOMER,
      index: true,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "LOCKED", "SUSPENDED"],
      default: "ACTIVE",
      index: true,
    },
    isEmailVerified: { type: Boolean, default: false, index: true },
    failedLoginAttempts: { type: Number, default: 0 },
    lockoutUntil: { type: Date, default: null },
    mfaEnabled: { type: Boolean, default: false },
    mfaSecret: { type: String, select: false },
    backupCodes: { type: [BackupCodeSchema], default: [], select: false },
    lastLoginAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_, ret: any) => {
        delete ret.passwordHash;
        delete ret.mfaSecret;
        delete ret.backupCodes;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound and secondary indexes
UserSchema.index({ role: 1, status: 1 });

export const User = mongoose.model<IUser>("User", UserSchema);

