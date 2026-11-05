import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';

// Sthiva identities are a verified phone (OTP) or a Google account (see apps/api's auth middleware), the same
// Firebase project apps/mobile and apps/seller-web sign in against, via the Web SDK.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// On sthiva.com the Google sign-in window runs from this site's own address (next.config rewrites /__/auth to
// Firebase), so people see sthiva.com instead of the Firebase project address. Elsewhere (local, previews) the
// configured Firebase address is used.
export function authDomainFor(hostname: string): string | undefined {
  return /(^|\.)sthiva\.com$/.test(hostname) ? hostname : process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
}

let app: FirebaseApp | undefined;
let auth: Auth | undefined;

export function getFirebaseAuth(): Auth {
  if (typeof window === 'undefined') {
    throw new Error('Firebase Auth is only available in the browser');
  }
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    throw new Error(
      'Missing Firebase config: set NEXT_PUBLIC_FIREBASE_* in .env.local (see .env.local.example)'
    );
  }
  if (!app) {
    app = getApps()[0] ?? initializeApp({ ...firebaseConfig, authDomain: authDomainFor(window.location.hostname) });
    auth = getAuth(app);
  }
  return auth!;
}
