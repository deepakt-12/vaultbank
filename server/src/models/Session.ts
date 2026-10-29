import mongoose, { Document, Schema, Types } from "mongoose";

export interface ISession extends Document {
  sessionId: string;
  userId: Types.ObjectId;
  userAgent: string;
  ipAddress: string;
  isValid: boolean;
  expiresAt: Date;
  lastActiveAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SessionSchema = new Schema<ISession>(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    userAgent: { type: String, default: "Unknown" },
    ipAddress: { type: String, default: "Unknown" },
    isValid: { type: Boolean, default: true, index: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } }, // TTL index
    lastActiveAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

SessionSchema.index({ userId: 1, isValid: 1 });

export const Session = mongoose.model<ISession>("Session", SessionSchema);

