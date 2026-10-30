'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useApiClient } from '@buildx/web-core';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { useAuth } from '@/components/auth/AuthProvider';
import { PageHead } from '@/components/account/AccountUI';
import { OrderRow } from '@/components/account/OrderRow';
import { fetchOrders, type BuyerOrder } from '@/lib/orders';

const RECENT_COUNT = 3;

const LINKS = [
  { href: '/orders', icon: 'receipt_long', label: 'All orders' },
  { href: '/cart', icon: 'shopping_cart', label: 'Cart' },
  { href: '/refunds', icon: 'currency_rupee', label: 'Cancellations and refunds' },
  { href: '/privacy', icon: 'shield_person', label: 'Privacy policy' },
  { href: '/terms', icon: 'gavel', label: 'Terms of service' },
];

function RecentOrders() {
  const client = useApiClient();
  const [state, setState] = useState<{ status: 'loading' } | { status: 'success'; orders: BuyerOrder[] } | { status: 'error' }>({ status: 'loading' });

  useEffect(() => {
    fetchOrders(client, 1)
      .then(({ data }) => setState({ status: 'success', orders: data.slice(0, RECENT_COUNT) }))
      .catch(() => setState({ status: 'error' }));
  }, [client]);

  if (state.status === 'error') return null;

  return (
    <section>
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold tracking-tight">Recent orders</h2>
        <Link href="/orders" className="text-[14px] font-medium text-cobalt hover:underline">View all</Link>
      </div>
      <div className="mt-4 flex flex-col gap-3">
        {state.status === 'loading' && [0, 1].map((i) => <div key={i} className="skeleton h-[92px]" />)}
        {state.status === 'success' && state.orders.length === 0 && (
          <p className="card px-5 py-6 text-[15px] text-stone">No orders yet. Your orders will show up here.</p>
        )}
        {state.status === 'success' && state.orders.map((order) => <OrderRow key={order._id} order={order} />)}
      </div>
    </section>
  );
}

function ProfileDetails() {
  const { user, signOut } = useAuth();
  if (!user) return null;

  return (
    <div className="grid gap-8 lg:grid-cols-[360px_minmax(0,1fr)]">
      <div className="flex flex-col gap-4">
        <section className="relative overflow-hidden rounded-3xl bg-ink p-6 text-sand">
          <div className="blueprint pointer-events-none absolute inset-0" aria-hidden="true" />
          <div className="relative flex items-center gap-4">
            <span className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-lime font-display text-3xl font-bold text-ink">
              {user.name[0]?.toUpperCase() ?? '?'}
            </span>
            <div className="min-w-0">
              <p className="truncate font-display text-2xl font-bold tracking-tight">{user.name}</p>
              <p className="mt-0.5 font-mono text-[14px] text-stone-light">{user.phone ?? user.email}</p>
            </div>
          </div>
          <p className="relative mt-5 flex items-center gap-1.5 text-[13px] text-stone-light">
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">verified_user</span>
            {user.phone ? 'Signed in with your phone number' : 'Signed in with Google'}
          </p>
        </section>

        <nav className="card overflow-hidden" aria-label="Account">
          <ul className="divide-y divide-sand-4/70">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="group flex min-h-[52px] items-center gap-3 px-5 py-3 text-[15px] transition-colors hover:bg-sand-3">
                  <span className="material-symbols-outlined text-[20px] text-stone" aria-hidden="true">{l.icon}</span>
                  <span className="flex-1">{l.label}</span>
                  <span className="material-symbols-outlined text-[20px] text-stone transition-transform group-hover:translate-x-1" aria-hidden="true">
                    chevron_right
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <button onClick={() => signOut()} className="btn-ghost w-full">
          <span className="material-symbols-outlined text-[20px]" aria-hidden="true">logout</span>
          Sign out
        </button>
      </div>

      <RecentOrders />
    </div>
  );
}

export default function ProfilePage() {
  return (
    <>
      <Header />
      <main id="main" className="container-x min-h-[70vh] pb-32 pt-[calc(var(--header-h)+40px)]">
        <PageHead eyebrow="Account" title="Your" accent="profile" />
        <div className="mt-10">
          <RequireAuth>
            <ProfileDetails />
          </RequireAuth>
        </div>
      </main>
      <BottomNav />
    </>
  );
}
