'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  RecaptchaVerifier,
  GoogleAuthProvider,
  signInWithPhoneNumber,
  signInWithPopup,
  signInWithRedirect,
  onAuthStateChanged,
  signOut as firebaseSignOut,
  type ConfirmationResult,
} from 'firebase/auth';
import { ApiClientError, useApiClient } from '@buildx/web-core';
import { getFirebaseAuth } from '../../lib/firebase';
import { syncAuth, onboardSupplier, type SyncedUser } from '../../lib/auth';

export type AuthStatus =
  | 'loading'
  | 'signed-out'
  | 'otp-sent'
  | 'needs-onboarding'
  | 'wrong-role'
  | 'signed-in'
  | 'config-error';

type AuthContextValue = {
  status: AuthStatus;
  user: SyncedUser | null;
  error: string | null;
  phoneInFlight: string | null;
  sendOtp: (phone: string) => Promise<void>;
  // Free sign-in: SMS codes need Firebase's paid plan, Google sign-in does not
  signInWithGoogle: () => Promise<void>;
  confirmOtp: (code: string) => Promise<void>;
  onboard: (input: { name: string; businessName: string; whatsappNumber: string }) => Promise<void>;
  signOut: () => Promise<void>;
  // Back to the phone step after a code was sent (wrong number, or to request a new code)
  resetOtp: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

// Firebase can wait on reCAPTCHA indefinitely; give up with a clear message instead of a stuck button
const SEND_TIMEOUT_MS = 45_000;

function describeAuthError(err: unknown): string {
  const code = (err as { code?: string } | null)?.code;
  switch (code) {
    case 'auth/invalid-phone-number':
      return 'Enter a valid 10-digit mobile number.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Try again in a few minutes.';
    case 'auth/invalid-verification-code':
      return 'That code is incorrect. Check the SMS and try again.';
    case 'app/send-timeout':
      return 'Sending the code took too long. Check your connection and try again.';
    case 'auth/operation-not-allowed':
    case 'auth/unauthorized-domain':
      return 'Google sign-in is not available on this site yet. Please try again later.';
    case 'auth/network-request-failed':
      return 'No internet connection. Check your connection and try again.';
    case 'auth/account-exists-with-different-credential':
      return 'This email is already used with another sign-in method. Contact BuildX support.';
    case 'auth/code-expired':
      return 'That code expired. Request a new one.';
    // Project-side SMS problems (Firebase billing off, daily SMS quota used up): not the user's fault
    case 'auth/billing-not-enabled':
    case 'auth/quota-exceeded':
      return 'We cannot send codes right now. Please try again later.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const client = useApiClient();
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<SyncedUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phoneInFlight, setPhoneInFlight] = useState<string | null>(null);
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);
  const confirmationRef = useRef<ConfirmationResult | null>(null);

  useEffect(() => {
    let auth;
    try {
      auth = getFirebaseAuth();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Firebase is not configured');
      setStatus('config-error');
      return;
    }
    return onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setUser(null);
        setStatus((s) => (s === 'otp-sent' ? s : 'signed-out'));
        return;
      }
      // Signed in to Firebase; keep screens busy until BuildX has loaded the account
      setStatus('loading');
      try {
        const synced = await syncAuth(client);
        setUser(synced);
        if (!synced.onboardingComplete) setStatus('needs-onboarding');
        else if (synced.role !== 'SUPPLIER') setStatus('wrong-role');
        else setStatus('signed-in');
      } catch (err) {
        // 401/403/409 carry a message meant for the user (suspended, already linked); otherwise it was the network
        const known = err instanceof ApiClientError && (err.status === 401 || err.status === 403 || err.status === 409);
        setError(known ? err.message : 'Could not reach BuildX. Check your connection and try again.');
        if (known) await firebaseSignOut(getFirebaseAuth()).catch(() => undefined);
        setStatus('signed-out');
      }
    });
  }, [client]);

  const sendOtp = useCallback(async (phone: string) => {
    setError(null);
    const auth = getFirebaseAuth();
    const e164 = phone.startsWith('+') ? phone : `+91${phone}`;
    try {
      // A reCAPTCHA token works once: reusing the verifier after "Change number" or "Resend code"
      // left the send hanging forever. Every send gets a fresh verifier in a fresh element.
      recaptchaRef.current?.clear();
      const host = document.getElementById('recaptcha-container');
      if (!host) throw new Error('reCAPTCHA container missing');
      host.replaceChildren();
      const el = document.createElement('div');
      host.appendChild(el);
      recaptchaRef.current = new RecaptchaVerifier(auth, el, { size: 'invisible' });
      confirmationRef.current = await Promise.race([
        signInWithPhoneNumber(auth, e164, recaptchaRef.current),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(Object.assign(new Error('timeout'), { code: 'app/send-timeout' })), SEND_TIMEOUT_MS)
        ),
      ]);
      setPhoneInFlight(e164);
      setStatus('otp-sent');
    } catch (err) {
      setError(describeAuthError(err));
      recaptchaRef.current?.clear();
      recaptchaRef.current = null;
    }
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setError(null);
    const auth = getFirebaseAuth();
    const provider = new GoogleAuthProvider();
    // Shared computers at shops: always let the seller pick which Google account
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      await signInWithPopup(auth, provider);
      // onAuthStateChanged fires next and drives the sync + status transition above
    } catch (err) {
      const code = (err as { code?: string } | null)?.code;
      // Closing the Google window is a choice, not an error
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return;
      if (code === 'auth/popup-blocked') {
        await signInWithRedirect(auth, provider).catch((e) => setError(describeAuthError(e)));
        return;
      }
      setError(describeAuthError(err));
    }
  }, []);

  const confirmOtp = useCallback(async (code: string) => {
    if (!confirmationRef.current) {
      setError('Request a new code and try again.');
      return;
    }
    setError(null);
    try {
      await confirmationRef.current.confirm(code);
      // onAuthStateChanged fires next and drives the sync + status transition above
    } catch (err) {
      setError(describeAuthError(err));
    }
  }, []);

  const onboard = useCallback(
    async (input: { name: string; businessName: string; whatsappNumber: string }) => {
      setError(null);
      try {
        const synced = await onboardSupplier(client, input);
        setUser(synced);
        setStatus('signed-in');
      } catch {
        setError('Could not complete onboarding. Please try again.');
      }
    },
    [client]
  );

  const resetOtp = useCallback(() => {
    confirmationRef.current = null;
    setPhoneInFlight(null);
    setError(null);
    setStatus((s) => (s === 'otp-sent' ? 'signed-out' : s));
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut(getFirebaseAuth());
    confirmationRef.current = null;
    setPhoneInFlight(null);
    setStatus('signed-out');
  }, []);

  return (
    <AuthContext.Provider value={{ status, user, error, phoneInFlight, sendOtp, signInWithGoogle, confirmOtp, onboard, signOut, resetOtp }}>
      {children}
      <div id="recaptcha-container" />
    </AuthContext.Provider>
  );
}
