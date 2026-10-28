'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  onAuthStateChanged,
  signOut as firebaseSignOut,
  type ConfirmationResult,
} from 'firebase/auth';
import { useApiClient } from '@buildx/web-core';
import { getFirebaseAuth } from '../../lib/firebase';
import { syncAuth, onboardBuyer, type SyncedUser } from '../../lib/auth';

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
  confirmOtp: (code: string) => Promise<void>;
  onboard: (name: string) => Promise<void>;
  signOut: () => Promise<void>;
  // Back to the phone step after an OTP was sent (wrong number, or to request again)
  resetOtp: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

function describeAuthError(err: unknown): string {
  const code = (err as { code?: string } | null)?.code;
  switch (code) {
    case 'auth/invalid-phone-number':
      return 'Enter a valid 10-digit mobile number.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Try again in a few minutes.';
    case 'auth/invalid-verification-code':
      return 'That code is incorrect. Check the SMS and try again.';
    case 'auth/code-expired':
      return 'That code expired. Request a new one.';
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
      try {
        const synced = await syncAuth(client);
        setUser(synced);
        if (!synced.onboardingComplete) setStatus('needs-onboarding');
        else if (synced.role !== 'BUYER') setStatus('wrong-role');
        else setStatus('signed-in');
      } catch {
        setError('Could not reach BuildX. Check your connection and try again.');
        setStatus('signed-out');
      }
    });
  }, [client]);

  const sendOtp = useCallback(async (phone: string) => {
    setError(null);
    const auth = getFirebaseAuth();
    const e164 = phone.startsWith('+') ? phone : `+91${phone}`;
    try {
      if (!recaptchaRef.current) {
        recaptchaRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'invisible' });
      }
      confirmationRef.current = await signInWithPhoneNumber(auth, e164, recaptchaRef.current);
      setPhoneInFlight(e164);
      setStatus('otp-sent');
    } catch (err) {
      setError(describeAuthError(err));
      recaptchaRef.current?.clear();
      recaptchaRef.current = null;
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
    async (name: string) => {
      setError(null);
      try {
        const synced = await onboardBuyer(client, name);
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
    <AuthContext.Provider value={{ status, user, error, phoneInFlight, sendOtp, confirmOtp, onboard, signOut, resetOtp }}>
      {children}
      <div id="recaptcha-container" />
    </AuthContext.Provider>
  );
}
