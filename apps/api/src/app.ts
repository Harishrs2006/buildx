import express, { Application, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import { env } from './config/env';
import { globalRateLimit } from './shared/middleware/rate-limit.middleware';
import { errorMiddleware } from './shared/middleware/error.middleware';
import { logger } from './shared/logger/logger';
import { userRoutes } from './features/users/user.routes';
import { webhookRoutes } from './features/webhooks/webhook.routes';
import { productRoutes } from './features/products/product.routes';
import { categoryRoutes } from './features/categories/category.routes';
import { supplierRoutes } from './features/suppliers/supplier.routes';

export function createApp(): Application {
  const app = express();

  // ─── Security headers ───────────────────────────────
  app.use(helmet());
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  // ─── CORS ───────────────────────────────────────────
  app.use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // ─── Raw body for Clerk webhooks (must come before json parser) ──
  app.use('/webhooks', express.raw({ type: 'application/json' }));

  // ─── Body parsing ───────────────────────────────────
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(compression());

  // ─── Request logging ────────────────────────────────
  app.use(
    morgan('combined', {
      stream: { write: (msg) => logger.http(msg.trim()) },
      skip: () => env.NODE_ENV === 'test',
    })
  );

  // ─── Health check ───────────────────────────────────
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'buildx-api',
      version: env.API_VERSION,
      timestamp: new Date().toISOString(),
    });
  });

  // ─── Webhooks (no rate limit, no auth — svix signed) ─
  app.use('/webhooks', webhookRoutes);

  // ─── Rate limiting on all API routes ────────────────
  app.use(`/api/${env.API_VERSION}`, globalRateLimit);

  // ─── Feature routes ─────────────────────────────────
  app.use(`/api/${env.API_VERSION}/users`, userRoutes);
  app.use(`/api/${env.API_VERSION}/products`, productRoutes);
  app.use(`/api/${env.API_VERSION}/categories`, categoryRoutes);
  app.use(`/api/${env.API_VERSION}/suppliers`, supplierRoutes);

  // ─── 404 handler ────────────────────────────────────
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Route not found' },
    });
  });

  // ─── Global error handler ───────────────────────────
  app.use(errorMiddleware);

  return app;
}
