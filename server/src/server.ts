import { app } from "./app";
import { connectDB } from "./config/db";
import { env } from "./config/env";
import { logger } from "./utils/logger";
import { LedgerService } from "./services/ledgerService";

async function bootstrap() {
  try {
    await connectDB();

    // Ensure double-entry system accounts exist
    await LedgerService.ensureSystemAccounts(env.DEFAULT_CURRENCY as any);

    const server = app.listen(env.PORT, () => {
      logger.info(
        {
          port: env.PORT,
          env: env.NODE_ENV,
          clientUrl: env.CLIENT_URL,
        },
        `VaultBank Core Server running on port ${env.PORT}`
      );
    });

    const shutdown = async (signal: string) => {
      logger.info({ signal }, "Gracefully terminating VaultBank server...");
      server.close(() => {
        logger.info("HTTP server closed.");
        process.exit(0);
      });
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  } catch (error) {
    logger.error({ error }, "Fatal startup error");
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== "test") {
  bootstrap();
}

