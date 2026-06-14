import { initializeApp, getApps, cert, applicationDefault } from 'firebase-admin/app';
import { env } from './env';

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
            privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          }),
        }
      : { credential: applicationDefault() }
  );
}
