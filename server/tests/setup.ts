import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { beforeAll, afterAll, beforeEach } from "vitest";

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  process.env.NODE_ENV = "test";
  process.env.SESSION_SECRET = "test-session-secret-at-least-32-chars-long-secure";
  process.env.COOKIE_SECURE = "false";
  process.env.CSRF_SECRET = "test-csrf-secret-32-chars-long-random";
  process.env.RATE_LIMIT_MAX_REQUESTS = "10000";
  process.env.AUTH_RATE_LIMIT_MAX_REQUESTS = "1000";

  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

beforeEach(async () => {
  if (mongoose.connection.db) {
    const collections = await mongoose.connection.db.collections();
    for (const collection of collections) {
      await collection.deleteMany({});
    }
  }
});

