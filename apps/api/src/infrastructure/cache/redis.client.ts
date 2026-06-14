import Redis from 'ioredis';
import { env } from '../../config/env';
import { logger } from '../../shared/logger/logger';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: true,
});

redis.on('connect', () => logger.info('Redis connected'));
redis.on('error', () => {}); // suppress noisy reconnect errors in dev
redis.on('close', () => logger.warn('Redis connection closed'));

export async function connectRedis(): Promise<void> {
  try {
    await redis.connect();
  } catch {
    logger.warn('Redis unavailable — caching disabled (install Redis for rate limiting)');
  }
}

export class CacheService {
  private static readonly DEFAULT_TTL = 3600;

  static async get<T>(key: string): Promise<T | null> {
    const value = await redis.get(key);
    return value ? (JSON.parse(value) as T) : null;
  }

  static async set(key: string, value: unknown, ttl = this.DEFAULT_TTL): Promise<void> {
    await redis.set(key, JSON.stringify(value), 'EX', ttl);
  }

  static async del(key: string): Promise<void> {
    await redis.del(key);
  }

  static async delPattern(pattern: string): Promise<void> {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) await redis.del(...keys);
  }

  static buildKey(...parts: string[]): string {
    return parts.join(':');
  }
}
