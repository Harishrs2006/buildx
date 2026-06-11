import express, { Application, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import { env } from './config/env';
import { globalRateLimit } from './shared/middleware/rate-limit.middleware';
import { errorMiddleware } from './shared/middleware/error.middleware';
import { logger } from './shared/logger/logger';

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

  // ─── Rate limiting ──────────────────────────────────
  app.use(`/api/${env.API_VERSION}`, globalRateLimit);

  // ─── Health check ───────────────────────────────────
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'buildx-api',
      version: env.API_VERSION,
      timestamp: new Date().toISOString(),
    });
  });

  // ─── API Routes (registered by feature) ─────────────
  // Routes are registered in server.ts after app creation
  // This keeps app.ts testable without side effects

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
