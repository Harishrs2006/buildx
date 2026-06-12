import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { env } from './env';

export function initFirebase() {
  if (getApps().length > 0) return;

  initializeApp({
    credential: cert({
      projectId: env.FIREBASE_PROJECT_ID,
      clientEmail: env.FIREBASE_CLIENT_EMAIL,
      // Firebase private key comes as a string with literal \n — replace them
      privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
}
