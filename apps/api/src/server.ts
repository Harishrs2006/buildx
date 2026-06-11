import './config/env'; // Validate env vars first
import { createApp } from './app';
import { connectDatabase, disconnectDatabase } from './infrastructure/database/prisma.client';
import { connectRedis, redis } from './infrastructure/cache/redis.client';
import { logger } from './shared/logger/logger';
import { env } from './config/env';

async function bootstrap(): Promise<void> {
  const app = createApp();

  await connectDatabase();
  await connectRedis();

  const server = app.listen(env.API_PORT, () => {
    logger.info(`🚀 BuildX API running on port ${env.API_PORT}`);
    logger.info(`   Environment: ${env.NODE_ENV}`);
    logger.info(`   Version:     ${env.API_VERSION}`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received — shutting down`);
    server.close(async () => {
      await disconnectDatabase();
      await redis.quit();
      logger.info('Server shut down cleanly');
      process.exit(0);
    });

    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection', { reason });
    shutdown('unhandledRejection');
  });

  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception', { error: err.message, stack: err.stack });
    shutdown('uncaughtException');
  });
}

bootstrap();
