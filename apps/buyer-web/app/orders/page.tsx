'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useApiClient } from '@buildx/web-core';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { fetchOrders, type BuyerOrder } from '@/lib/orders';

const rupees = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });

function OrdersList() {
  const client = useApiClient();
  const [page, setPage] = useState(1);
  const [state, setState] = useState<
    { status: 'loading' } | { status: 'success'; orders: BuyerOrder[]; hasNext: boolean; hasPrev: boolean } | { status: 'error' }
  >({ status: 'loading' });

  useEffect(() => {
    setState({ status: 'loading' });
    fetchOrders(client, page)
      .then(({ data, meta }) => setState({ status: 'success', orders: data, hasNext: meta.hasNext, hasPrev: meta.hasPrev }))
      .catch(() => setState({ status: 'error' }));
  }, [client, page]);

  if (state.status === 'loading') return <p className="py-24 text-center font-body text-on-surface-variant">Loading…</p>;
  if (state.status === 'error') return <p className="py-24 text-center font-body text-error">Couldn't load your orders.</p>;

  if (state.orders.length === 0) {
    return (
      <div className="py-24 text-center">
        <p className="font-body text-on-surface-variant">No orders yet.</p>
        <Link href="/" className="mt-4 inline-block font-body font-bold text-primary">Browse categories</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {state.orders.map((order) => (
        <Link key={order._id} href={`/orders/${order._id}`} className="flex items-center justify-between rounded-xl bg-surface-container-low p-4">
          <div>
            <p className="font-body text-sm font-semibold text-on-surface">{order.orderNumber}</p>
            <p className="font-body text-xs text-on-surface-variant">{order.items.length} item{order.items.length > 1 ? 's' : ''} · {order.status.replace('_', ' ')}</p>
          </div>
          <span className="font-headline font-bold">{rupees.format(order.total)}</span>
        </Link>
      ))}
      {(state.hasNext || state.hasPrev) && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button disabled={!state.hasPrev} onClick={() => setPage((p) => p - 1)} className="rounded-lg bg-surface-container-high px-3 py-2 disabled:opacity-40">
            <span className="material-symbols-outlined text-lg">chevron_left</span>
          </button>
          <button disabled={!state.hasNext} onClick={() => setPage((p) => p + 1)} className="rounded-lg bg-surface-container-high px-3 py-2 disabled:opacity-40">
            <span className="material-symbols-outlined text-lg">chevron_right</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default function OrdersPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-2xl px-4 pb-32 pt-24 md:px-8">
        <h1 className="mb-6 font-headline text-3xl font-bold tracking-tighter">Orders</h1>
        <RequireAuth>
          <OrdersList />
        </RequireAuth>
      </main>
      <BottomNav />
    </>
  );
}
