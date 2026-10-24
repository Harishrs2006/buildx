'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useApiClient } from '@buildx/web-core';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { fetchOrder, cancelBuyerOrder, type BuyerOrder } from '@/lib/orders';

const rupees = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });

function OrderDetail({ id }: { id: string }) {
  const client = useApiClient();
  const [state, setState] = useState<{ status: 'loading' } | { status: 'success'; order: BuyerOrder } | { status: 'error' }>({ status: 'loading' });
  const [cancelling, setCancelling] = useState(false);

  function load() {
    fetchOrder(client, id)
      .then((order) => setState({ status: 'success', order }))
      .catch(() => setState({ status: 'error' }));
  }

  useEffect(load, [client, id]);

  async function handleCancel() {
    if (!confirm('Cancel this order?')) return;
    setCancelling(true);
    try {
      await cancelBuyerOrder(client, id);
      load();
    } finally {
      setCancelling(false);
    }
  }

  if (state.status === 'loading') return <p className="py-24 text-center font-body text-on-surface-variant">Loading…</p>;
  if (state.status === 'error') return <p className="py-24 text-center font-body text-error">Couldn't load this order.</p>;

  const { order } = state;
  const cancellable = order.status === 'PENDING' || order.status === 'CONFIRMED';

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3 rounded-xl bg-primary-container px-4 py-3">
        <span className="material-symbols-outlined text-on-primary-container">check_circle</span>
        <div>
          <p className="font-headline font-bold text-on-primary-container">Order {order.orderNumber}</p>
          <p className="font-body text-sm text-on-primary-container">Status: {order.status.replace('_', ' ')}</p>
        </div>
      </div>

      <div className="rounded-xl bg-surface-container-low p-5">
        <h2 className="font-headline font-bold">Items</h2>
        <ul className="mt-3 flex flex-col gap-2 font-body text-sm">
          {order.items.map((item, i) => (
            <li key={i} className="flex justify-between">
              <span>{item.quantity} {item.unit.toLowerCase()} × {item.name}</span>
              <span className="font-semibold">{rupees.format(item.lineTotal)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex justify-between border-t border-outline-variant/30 pt-3 font-headline font-bold">
          <span>Total</span>
          <span>{rupees.format(order.total)}</span>
        </div>
      </div>

      <div className="rounded-xl bg-surface-container-low p-5">
        <h2 className="font-headline font-bold">Delivery address</h2>
        <p className="mt-2 font-body text-sm text-on-surface-variant">{order.deliveryAddress.label} — {order.deliveryAddress.fullAddress}</p>
      </div>

      {cancellable && (
        <button
          onClick={handleCancel}
          disabled={cancelling}
          className="rounded-lg bg-error-container py-3 font-body text-sm font-bold uppercase text-on-error-container disabled:opacity-50"
        >
          {cancelling ? 'Cancelling…' : 'Cancel order'}
        </button>
      )}

      <Link href="/orders" className="font-body font-bold text-primary">← Back to orders</Link>
    </div>
  );
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <>
      <Header />
      <main className="mx-auto max-w-2xl px-4 pb-32 pt-24 md:px-8">
        <RequireAuth>
          <OrderDetail id={id} />
        </RequireAuth>
      </main>
      <BottomNav />
    </>
  );
}
