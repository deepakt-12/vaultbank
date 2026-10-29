import dotenv from "dotenv";
import path from "path";
import { z } from "zod";

// Load environment variables from .env if present
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config(); // Fallback to current directory .env

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(5000),
  CLIENT_URL: z.string().default("http://localhost:5173"),

  MONGODB_URI: z
    .string()
    .default("mongodb://127.0.0.1:27017/vaultbank?replicaSet=rs0"),
  MONGODB_DB_NAME: z.string().default("vaultbank"),

  SESSION_SECRET: z
    .string()
    .min(32, "SESSION_SECRET must be at least 32 characters long")
    .default("dev-session-secret-vaultbank-min-32-chars-long-secure-random"),
  SESSION_NAME: z.string().default("vaultbank.sid"),
  SESSION_MAX_AGE_MS: z.coerce.number().default(86400000), // 24 hours

  COOKIE_SECURE: z
    .string()
    .transform((val) => val === "true")
    .default("false"),
  COOKIE_SAME_SITE: z.enum(["lax", "strict", "none"]).default("lax"),

  CSRF_SECRET: z
    .string()
    .default("dev-csrf-secret-vaultbank-32-chars-secure"),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000), // 15 mins
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(1000),
  AUTH_RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(30),

  ARGON2_TIME_COST: z.coerce.number().default(2),
  ARGON2_MEMORY_COST: z.coerce.number().default(32768), // 32MB
  ARGON2_PARALLELISM: z.coerce.number().default(1),

  EMAIL_PROVIDER: z.enum(["console", "smtp"]).default("console"),
  EMAIL_FROM: z.string().default("no-reply@vaultbank.example.com"),

  MFA_APP_NAME: z.string().default("VaultBank"),
  DEFAULT_CURRENCY: z.string().default("USD"),
  MAX_TRANSFER_AMOUNT_CENTS: z.coerce.number().default(10000000), // $100,000.00
  HIGH_RISK_TRANSFER_THRESHOLD_CENTS: z.coerce.number().default(500000), // $5,000.00
  VELOCITY_MAX_TRANSFERS_PER_HOUR: z.coerce.number().default(10),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("Invalid environment configuration:", parsedEnv.error.format());
  throw new Error("Invalid environment variables");
}

export const env = parsedEnv.data;

