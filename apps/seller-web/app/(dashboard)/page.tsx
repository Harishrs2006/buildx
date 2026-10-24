'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useApiClient } from '@buildx/web-core';
import { useSupplierStats } from '../../lib/stats';
import { fetchSupplierProfile, type SupplierProfile } from '../../lib/auth';

function StatCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-surface-container-low p-5">
      <div className="flex items-center gap-2 text-on-surface-variant">
        <span className="material-symbols-outlined text-xl">{icon}</span>
        <span className="font-body text-xs font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <span className="font-headline text-2xl font-bold text-on-surface">{value}</span>
    </div>
  );
}

export default function DashboardPage() {
  const client = useApiClient();
  const stats = useSupplierStats();
  const [profile, setProfile] = useState<SupplierProfile | null>(null);

  useEffect(() => {
    fetchSupplierProfile(client).then(setProfile).catch(() => {});
  }, [client]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-headline text-2xl font-bold text-on-surface">Dashboard</h1>
        {profile && <p className="mt-1 font-body text-sm text-on-surface-variant">{profile.businessName}</p>}
      </div>

      {profile?.verificationStatus === 'PENDING' && (
        <div className="flex items-center gap-3 rounded-xl bg-secondary-container px-4 py-3">
          <span className="material-symbols-outlined text-on-secondary-container">hourglass_top</span>
          <p className="font-body text-sm text-on-secondary-container">
            Your account is awaiting verification. You can add products now — they'll go live for
            buyers as soon as BuildX approves your account.
          </p>
        </div>
      )}
      {profile?.verificationStatus === 'REJECTED' && (
        <div className="flex items-center gap-3 rounded-xl bg-error-container px-4 py-3">
          <span className="material-symbols-outlined text-on-error-container">error</span>
          <p className="font-body text-sm text-on-error-container">
            Your verification was not approved. Contact BuildX support for details.
          </p>
        </div>
      )}

      {stats.status === 'success' && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Today's orders" value={String(stats.data.todayOrders)} icon="today" />
          <StatCard label="Pending orders" value={String(stats.data.pendingOrders)} icon="pending_actions" />
          <StatCard label="Active products" value={String(stats.data.activeProducts)} icon="inventory_2" />
          <StatCard label="Revenue (delivered)" value={`₹${stats.data.totalRevenue.toLocaleString('en-IN')}`} icon="payments" />
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <Link
          href="/products/new"
          className="flex items-center gap-2 rounded-lg bg-primary px-5 py-3 font-body text-sm font-bold uppercase tracking-wide text-on-primary"
        >
          <span className="material-symbols-outlined">add</span>
          Add a product
        </Link>
        <Link
          href="/orders"
          className="flex items-center gap-2 rounded-lg bg-surface-container-high px-5 py-3 font-body text-sm font-bold uppercase tracking-wide text-on-surface"
        >
          View orders
        </Link>
      </div>
    </div>
  );
}
