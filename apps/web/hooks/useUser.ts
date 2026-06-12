'use client';

import { useAuth, useUser as useClerkUser } from '@clerk/nextjs';
import { useCallback } from 'react';
import { apiClient } from '@/lib/api-client';

type UserRole = 'BUYER' | 'SUPPLIER' | 'ADMIN' | 'SUPER_ADMIN';

export function useUser() {
  const { userId, sessionClaims, getToken, isLoaded, isSignedIn } = useAuth();
  const { user: clerkUser } = useClerkUser();

  const metadata = sessionClaims?.metadata as Record<string, unknown> | undefined;
  const role = metadata?.role as UserRole | undefined;
  const onboardingComplete = metadata?.onboardingComplete as boolean | undefined;

  const isBuyer = role === 'BUYER';
  const isSupplier = role === 'SUPPLIER';
  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';

  const fetchMe = useCallback(async () => {
    const token = await getToken();
    return apiClient.get('/users/me', { token: token ?? undefined });
  }, [getToken]);

  return {
    userId,
    role,
    onboardingComplete,
    isBuyer,
    isSupplier,
    isAdmin,
    isLoaded,
    isSignedIn,
    clerkUser,
    fetchMe,
    getToken,
  };
}
