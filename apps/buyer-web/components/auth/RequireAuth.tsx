'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from './AuthProvider';

// Wraps just the pages that need a signed-in buyer (cart/checkout, orders, profile) — browsing
// and product pages stay public, unlike apps/seller-web's whole-app RequireSupplier.
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === 'signed-out') router.replace(`/signin?next=${encodeURIComponent(pathname)}`);
    if (status === 'needs-onboarding') router.replace(`/onboard?next=${encodeURIComponent(pathname)}`);
  }, [status, router, pathname]);

  if (status === 'signed-in') return <>{children}</>;

  if (status === 'config-error') {
    return <p className="py-24 text-center font-body text-sm text-error">Sign-in isn't configured yet.</p>;
  }

  if (status === 'wrong-role') {
    return (
      <div className="flex flex-col items-center gap-2 px-6 py-24 text-center">
        <p className="font-headline text-lg font-bold text-on-surface">This number isn't a buyer account</p>
        <p className="max-w-sm font-body text-sm text-on-surface-variant">
          This phone number is already registered on BuildX with a different role. Sign in with a
          different number to shop here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-24">
      <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
    </div>
  );
}
