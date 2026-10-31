'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';

// Wraps every page under the dashboard shell. Firebase restoring a session is async, so this
// also owns the brief "loading" flash rather than letting each page guess.
export function RequireSupplier({ children }: { children: React.ReactNode }) {
  const { status, error, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === 'signed-out') router.replace('/signin');
    if (status === 'needs-onboarding') router.replace('/onboard');
  }, [status, router]);

  if (status === 'signed-in') return <>{children}</>;

  if (status === 'config-error') {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center">
        <p className="max-w-sm text-[15px] text-error">{error ?? 'The supplier portal is not configured yet.'}</p>
      </div>
    );
  }

  if (status === 'wrong-role') {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center">
        <div className="max-w-sm">
          <p className="font-display text-2xl font-semibold tracking-tight">This account isn&apos;t a supplier account</p>
          <p className="mt-2 text-[15px] text-stone">
            It is already registered on BuildX as a buyer or another role. Sign out, then sign in with the
            Google account you use for your business, or contact support if this looks wrong.
          </p>
          <button type="button" onClick={() => void signOut()} className="btn-ink mt-6 px-6">Sign out</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <span className="material-symbols-outlined animate-spin text-4xl text-ink" role="status" aria-label="Loading">progress_activity</span>
    </div>
  );
}
