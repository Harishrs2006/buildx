import auth from '@react-native-firebase/auth';
import { GoogleSignin, isErrorWithCode, isSuccessResponse, statusCodes } from '@react-native-google-signin/google-signin';

// Web OAuth client of Firebase project buildx-15494 (public value, also in google-services.json).
// Firebase only accepts Google ID tokens issued for this client.
const WEB_CLIENT_ID = '1054722710633-5ibngcurcbkp88qg0fi4dvkn34ig4r05.apps.googleusercontent.com';

let configured = false;
function ensureConfigured() {
  if (configured) return;
  GoogleSignin.configure({ webClientId: WEB_CLIENT_ID });
  configured = true;
}

/**
 * Opens the Google account picker and signs in to Firebase.
 * Returns false when the user closed the picker. Throws an Error with a user-facing message otherwise.
 * AuthGate (app/_layout.tsx) picks up the Firebase user and syncs with the API.
 */
export async function signInWithGoogle(): Promise<boolean> {
  ensureConfigured();
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const res = await GoogleSignin.signIn();
    if (!isSuccessResponse(res)) return false;
    const idToken = res.data.idToken;
    if (!idToken) throw new Error('Google did not return a sign-in token. Please try again.');
    await auth().signInWithCredential(auth.GoogleAuthProvider.credential(idToken));
    return true;
  } catch (err: any) {
    if (isErrorWithCode(err)) {
      if (err.code === statusCodes.SIGN_IN_CANCELLED) return false;
      if (err.code === statusCodes.IN_PROGRESS) return false;
      if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new Error('Google Play services is needed to sign in with Google on this phone.');
      }
    }
    if (err instanceof Error && err.message.startsWith('Google did not')) throw err;
    throw new Error('We could not sign you in with Google. Check your internet and try again.');
  }
}

// Signs out of Firebase and Google, so the account picker shows again next time.
export async function signOutEverywhere() {
  try {
    ensureConfigured();
    await GoogleSignin.signOut();
  } catch {
    // Not signed in with Google (phone sign-in): nothing to do
  }
  await auth().signOut();
}
