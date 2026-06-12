'use client';

import { useAuth } from '@clerk/nextjs';
import { redirect } from 'next/navigation';
import { ReactNode } from 'react';

type Role = 'BUYER' | 'SUPPLIER' | 'ADMIN' | 'SUPER_ADMIN';

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles: Role[];
  fallback?: ReactNode;
  redirectTo?: string;
}

export function RoleGuard({ children, allowedRoles, fallback, redirectTo }: RoleGuardProps) {
  const { sessionClaims } = useAuth();
  const role = (sessionClaims?.metadata as any)?.role as Role | undefined;

  if (!role || !allowedRoles.includes(role)) {
    if (redirectTo) redirect(redirectTo);
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
}
