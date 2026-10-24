'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useApiClient } from '@buildx/web-core';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { useAuth } from '@/components/auth/AuthProvider';
import { fetchOrders, type BuyerOrder } from '@/lib/orders';

const rupees = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });
const RECENT_COUNT = 3;

function RecentOrders() {
  const client = useApiClient();
  const [state, setState] = useState<{ status: 'loading' } | { status: 'success'; orders: BuyerOrder[] } | { status: 'error' }>({ status: 'loading' });

  useEffect(() => {
    fetchOrders(client, 1)
      .then(({ data }) => setState({ status: 'success', orders: data.slice(0, RECENT_COUNT) }))
      .catch(() => setState({ status: 'error' }));
  }, [client]);

  if (state.status === 'loading') return null;
  if (state.status === 'error') return null;

  return (
    <div className="mt-8 flex flex-col gap-3 text-left">
      <div className="flex items-center justify-between">
        <h2 className="font-headline font-bold text-on-surface">Recent orders</h2>
        <Link href="/orders" className="font-body text-sm font-bold text-primary">View all</Link>
      </div>
      {state.orders.length === 0 ? (
        <p className="font-body text-sm text-on-surface-variant">No orders yet.</p>
      ) : (
        state.orders.map((order) => (
          <Link key={order._id} href={`/orders/${order._id}`} className="flex items-center justify-between rounded-xl bg-surface-container-low p-4">
            <div>
              <p className="font-body text-sm font-semibold text-on-surface">{order.orderNumber}</p>
              <p className="font-body text-xs text-on-surface-variant">{order.status.replace('_', ' ')}</p>
            </div>
            <span className="font-headline font-bold">{rupees.format(order.total)}</span>
          </Link>
        ))
      )}
    </div>
  );
}

function ProfileDetails() {
  const { user, signOut } = useAuth();
  if (!user) return null;

  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-surface-container-high font-headline text-3xl font-bold text-on-surface-variant">
        {user.name[0]?.toUpperCase() ?? '?'}
      </div>
      <div>
        <p className="font-headline text-xl font-bold text-on-surface">{user.name}</p>
        <p className="font-body text-sm text-on-surface-variant">{user.phone}</p>
      </div>
      <button
        onClick={() => signOut()}
        className="mt-4 rounded-lg bg-surface-container-high px-6 py-3 font-body text-sm font-bold uppercase text-on-surface"
      >
        Sign out
      </button>
      <div className="w-full">
        <RecentOrders />
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-md px-4 pb-32 pt-24 md:px-8">
        <h1 className="font-headline text-3xl font-bold tracking-tighter">Profile</h1>
        <RequireAuth>
          <ProfileDetails />
        </RequireAuth>
      </main>
      <BottomNav />
    </>
  );
}
