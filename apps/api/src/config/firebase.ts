import { initializeApp, getApps, cert, applicationDefault } from 'firebase-admin/app';
import { env } from './env';

// Dashboard pastes often arrive with escaped "\n", wrapping quotes or stray text around the key.
// Keep only the PEM block itself, otherwise token checks fail with "must be an asymmetric key".
export function normalizePrivateKey(raw: string): string {
  const key = raw.replace(/\\n/g, '\n');
  const pem = key.match(/-----BEGIN PRIVATE KEY-----[\s\S]+?-----END PRIVATE KEY-----/);
  return pem ? `${pem[0]}\n` : key;
}

export function initFirebase() {
  if (getApps().length > 0) return;

  // Use service account key if all three env vars are present (production),
  // otherwise fall back to Application Default Credentials (local dev via gcloud CLI).
  const hasKeyCredentials =
    env.FIREBASE_PROJECT_ID && env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY;

  initializeApp(
    hasKeyCredentials
      ? {
          credential: cert({
            projectId: env.FIREBASE_PROJECT_ID,
            clientEmail: env.FIREBASE_CLIENT_EMAIL,
            privateKey: normalizePrivateKey(env.FIREBASE_PRIVATE_KEY),
          }),
        }
      : { credential: applicationDefault() }
  );
}
