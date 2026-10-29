'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';

// Wraps every console page. Only OPERATOR and ADMIN accounts get past this; the API enforces
// the same rule on every /ops route, so this is about a clear message, not security.
export function RequireOps({ children }: { children: React.ReactNode }) {
  const { status, error, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === 'signed-out') router.replace('/signin');
  }, [status, router]);

  if (status === 'signed-in') return <>{children}</>;

  if (status === 'config-error') {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center">
        <p className="max-w-sm text-[15px] text-error">{error ?? 'The operations console is not configured yet.'}</p>
      </div>
    );
  }

  if (status === 'wrong-role') {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center">
        <div className="max-w-sm">
          <p className="font-display text-2xl font-semibold tracking-tight">This number has no operations access</p>
          <p className="mt-2 text-[15px] text-stone">
            The console is only for the BuildX operations team. Ask an admin to give your number access, then sign in again.
          </p>
          <button type="button" onClick={() => signOut()} className="btn-ghost mt-6">Sign out</button>
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
