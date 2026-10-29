import pino from "pino";
import { env } from "../config/env";

export const logger = pino({
  level: env.NODE_ENV === "test" ? "silent" : env.NODE_ENV === "production" ? "info" : "debug",
  redact: {
    paths: [
      "req.headers.cookie",
      "req.headers.authorization",
      "req.headers['x-vaultbank-csrf']",
      "password",
      "newPassword",
      "reauthPassword",
      "token",
      "mfaSecret",
      "backupCodes",
      "*.password",
      "*.token",
      "*.mfaSecret",
      "body.password",
      "body.newPassword",
      "body.reauthPassword",
      "body.token",
      "body.mfaCode",
    ],
    censor: "[REDACTED_FINANCIAL_OR_AUTH_SECRET]",
  },
  transport:
    env.NODE_ENV !== "production" && env.NODE_ENV !== "test"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
          },
        }
      : undefined,
});

