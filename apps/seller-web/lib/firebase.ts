import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';

// BuildX identities are a verified phone (OTP) or, on this site, a Google account (see apps/api's
// auth middleware). This is the same Firebase project apps/mobile signs in against, just through
// the Web SDK instead of @react-native-firebase.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp | undefined;
let auth: Auth | undefined;

export function getFirebaseAuth(): Auth {
  if (typeof window === 'undefined') {
    throw new Error('Firebase Auth is only available in the browser');
  }
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    // Developers see how to fix it in the console; suppliers see a plain message
    console.error('Missing Firebase config: set NEXT_PUBLIC_FIREBASE_* in .env.local (see .env.local.example)');
    throw new Error('Sign-in is not available on this site yet. Please try again later.');
  }
  if (!app) {
    app = getApps()[0] ?? initializeApp(firebaseConfig);
    auth = getAuth(app);
  }
  return auth!;
}
