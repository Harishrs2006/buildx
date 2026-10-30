import "./config/env";
import { initFirebase } from "./config/firebase";
import { createApp } from "./app";
import { connectDatabase, disconnectDatabase } from "./infrastructure/database/mongoose.client";
import { dropLegacyUserIndexes } from "./infrastructure/database/models/User.model";
import { connectRedis, redis } from "./infrastructure/cache/redis.client";
import { logger } from "./shared/logger/logger";
import { env } from "./config/env";

import { registerRoutes } from "./routes";

async function bootstrap(): Promise<void> {
  // Init Firebase Admin before anything else
  initFirebase();

  const app = createApp();

  registerRoutes(app);

  await connectDatabase(env.MONGODB_URI);
  await dropLegacyUserIndexes().catch((err) => logger.error("Could not drop legacy phone_1 index", { error: err?.message }));
  await connectRedis();

  const server = app.listen(env.API_PORT, () => {
    logger.info(`BuildX API running on port ${env.API_PORT} [${env.NODE_ENV}]`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received — shutting down`);
    server.close(async () => {
      await disconnectDatabase();
      await redis.quit();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled rejection", { reason });
    shutdown("unhandledRejection");
  });
  process.on("uncaughtException", (err) => {
    logger.error("Uncaught exception", { error: err.message });
    shutdown("uncaughtException");
  });
}

bootstrap();