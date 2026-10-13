import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  // Hosting platforms (Render, Railway, Cloud Run) provide PORT; API_PORT overrides it
  API_PORT: z.coerce.number().default(Number(process.env.PORT) || 4000),
  API_VERSION: z.string().default('v1'),
  FRONTEND_URL: z.string().default('http://localhost:3000'),

  MONGODB_URI: z.string().min(1),

  REDIS_URL: z.string().default('redis://localhost:6379'),

  // Firebase Admin SDK — optional when using Application Default Credentials (gcloud auth application-default login)
  FIREBASE_PROJECT_ID: z.string().optional().default(''),
  FIREBASE_CLIENT_EMAIL: z.string().optional().default(''),
  FIREBASE_PRIVATE_KEY: z.string().optional().default(''),

  // Cloudinary — required in production, optional for local dev
  CLOUDINARY_CLOUD_NAME: z.string().default(''),
  CLOUDINARY_API_KEY: z.string().default(''),
  CLOUDINARY_API_SECRET: z.string().default(''),

  // Razorpay — required in production, optional for local dev
  RAZORPAY_KEY_ID: z.string().default(''),
  RAZORPAY_KEY_SECRET: z.string().default(''),
  RAZORPAY_WEBHOOK_SECRET: z.string().default(''),

  // WhatsApp (Interakt)
  INTERAKT_API_KEY: z.string().optional(),

  // Anthropic — optional, AI chat disabled if not set
  ANTHROPIC_API_KEY: z.string().default(''),

  // Google Maps
  GOOGLE_MAPS_API_KEY: z.string().optional(),

  // Compatibility switch: while older mobile builds (which send no PIN code) are in use, orders
  // without a delivery PIN are accepted and flagged for ops. Set to "true" to require a PIN.
  ORDERS_REQUIRE_DELIVERY_PINCODE: z.enum(['true', 'false']).default('false').transform((v) => v === 'true'),

  API_RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  API_RATE_LIMIT_MAX: z.coerce.number().default(100),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

// In production, sign-in needs the Firebase service account. Without it firebase-admin falls back
// to default credentials that hosts like Render don't have, so the API would start and then reject
// every login. Fail the deploy instead.
if (parsed.data.NODE_ENV === 'production') {
  const missing = (['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY'] as const).filter(
    (key) => !parsed.data[key]
  );
  if (missing.length > 0) {
    console.error(`Missing required production environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
}

export const env = parsed.data;
export type Env = typeof env;