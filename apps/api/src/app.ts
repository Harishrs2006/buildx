import express, { Application, Request, Response } from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import morgan from "morgan";
import { env } from "./config/env";
import { globalRateLimit } from "./shared/middleware/rate-limit.middleware";
import { errorMiddleware } from "./shared/middleware/error.middleware";
import { logger } from "./shared/logger/logger";

export function createApp(): Application {
  const app = express();

  app.use(helmet());
  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  app.use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );

  // Raw body for Razorpay webhook signature verification
  app.use("/api/v1/payments/webhook", express.raw({ type: "application/json" }));

  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));
  app.use(compression());

  app.use(
    morgan("combined", {
      stream: { write: (msg) => logger.http(msg.trim()) },
      skip: () => env.NODE_ENV === "test",
    })
  );

  app.use(`/api/${env.API_VERSION}`, globalRateLimit);

  app.get("/health", (_req: Request, res: Response) => {
    res.json({
      status: "ok",
      service: "buildx-api",
      version: env.API_VERSION,
      timestamp: new Date().toISOString(),
    });
  });

  // Routes registered in server.ts after DB connect
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: { code: "NOT_FOUND", message: "Route not found" },
    });
  });

  app.use(errorMiddleware);

  return app;
}