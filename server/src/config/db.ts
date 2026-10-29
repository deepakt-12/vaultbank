import mongoose from "mongoose";
import { env } from "./env";
import { logger } from "../utils/logger";

export async function connectDB(): Promise<typeof mongoose> {
  try {
    const conn = await mongoose.connect(env.MONGODB_URI, {
      dbName: env.MONGODB_DB_NAME,
      autoIndex: true,
      maxPoolSize: 50,
      serverSelectionTimeoutMS: 5000,
    });
    logger.info({ uri: env.MONGODB_URI.replace(/\/\/.*@/, "//***:***@") }, "MongoDB Connected successfully");
    return conn;
  } catch (error) {
    logger.error({ error }, "MongoDB Connection Error");
    throw error;
  }
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
  logger.info("MongoDB Disconnected");
}

