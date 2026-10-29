import mongoose, { Document, Schema, Types } from "mongoose";

export interface IIdempotencyRecord extends Document {
  key: string;
  userId: Types.ObjectId;
  requestHash: string;
  status: "PROCESSING" | "COMPLETED" | "FAILED";
  statusCode?: number;
  responsePayload?: unknown;
  expiresAt: Date;
  createdAt: Date;
}

const IdempotencyRecordSchema = new Schema<IIdempotencyRecord>(
  {
    key: { type: String, required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    requestHash: { type: String, required: true },
    status: {
      type: String,
      enum: ["PROCESSING", "COMPLETED", "FAILED"],
      default: "PROCESSING",
    },
    statusCode: { type: Number },
    responsePayload: { type: Schema.Types.Mixed },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      index: { expires: 0 },
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

IdempotencyRecordSchema.index({ key: 1, userId: 1 }, { unique: true });

export const IdempotencyRecord = mongoose.model<IIdempotencyRecord>(
  "IdempotencyRecord",
  IdempotencyRecordSchema
);

