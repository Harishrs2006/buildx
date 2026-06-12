import "./config/env";
import { initFirebase } from "./config/firebase";
import { createApp } from "./app";
import { connectDatabase, disconnectDatabase } from "./infrastructure/database/mongoose.client";
import { connectRedis, redis } from "./infrastructure/cache/redis.client";
import { logger } from "./shared/logger/logger";
import { env } from "./config/env";

// Feature routes
import { authRoutes } from "./features/auth/auth.routes";
import { userRoutes } from "./features/users/user.routes";
import { categoryRoutes } from "./features/categories/category.routes";
import { productRoutes } from "./features/products/product.routes";
import { supplierRoutes } from "./features/suppliers/supplier.routes";
import { orderRoutes } from "./features/orders/order.routes";
import { paymentRoutes } from "./features/payments/payment.routes";
import { uploadRoutes } from "./features/upload/upload.routes";

async function bootstrap(): Promise<void> {
  // Init Firebase Admin before anything else
  initFirebase();

  const app = createApp();

  // Register routes
  const base = `/api/${env.API_VERSION}`;
  app.use(`${base}/auth`, authRoutes);
  app.use(`${base}/users`, userRoutes);
  app.use(`${base}/categories`, categoryRoutes);
  app.use(`${base}/products`, productRoutes);
  app.use(`${base}/suppliers`, supplierRoutes);
  app.use(`${base}/orders`, orderRoutes);
  app.use(`${base}/payments`, paymentRoutes);
  app.use(`${base}/upload`, uploadRoutes);

  await connectDatabase(env.MONGODB_URI);
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