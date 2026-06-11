import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().default(4000),
  API_VERSION: z.string().default('v1'),
  FRONTEND_URL: z.string().url(),

  DATABASE_URL: z.string().url(),

  REDIS_URL: z.string().default('redis://localhost:6379'),

  CLERK_SECRET_KEY: z.string().min(1),
  CLERK_WEBHOOK_SECRET: z.string().min(1),

  CLOUDINARY_CLOUD_NAME: z.string().min(1),
  CLOUDINARY_API_KEY: z.string().min(1),
  CLOUDINARY_API_SECRET: z.string().min(1),

  OPENAI_API_KEY: z.string().min(1),
  OPENAI_MODEL: z.string().default('gpt-4o'),
  OPENAI_EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),

  JWT_SECRET: z.string().min(32),

  API_RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  API_RATE_LIMIT_MAX: z.coerce.number().default(100),

  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().email().default('noreply@buildx.com'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
