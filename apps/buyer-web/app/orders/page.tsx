'use client';

import { useEffect, useState } from 'react';
import { useApiClient } from '@buildx/web-core';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { EmptyState, ErrorNote, PageHead } from '@/components/account/AccountUI';
import { OrderRow } from '@/components/account/OrderRow';
import { fetchOrders, type BuyerOrder } from '@/lib/orders';

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

  if (state.status === 'loading') {
    return (
      <div className="flex flex-col gap-3" role="status" aria-label="Loading orders">
        {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-[92px]" />)}
      </div>
    );
  }
  if (state.status === 'error') return <ErrorNote>Could not load your orders. Check your connection and try again.</ErrorNote>;

  if (state.orders.length === 0) {
    return (
      <EmptyState
        icon="receipt_long"
        title="No orders yet"
        body="When you place an order, you can track it here from confirmation to delivery."
        cta={{ href: '/#categories', label: 'Browse materials' }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {state.orders.map((order) => <OrderRow key={order._id} order={order} />)}
      {(state.hasNext || state.hasPrev) && (
        <nav className="flex items-center justify-center gap-3 pt-4" aria-label="Pages">
          <button disabled={!state.hasPrev} onClick={() => setPage((p) => p - 1)} className="btn-ghost h-11 px-4">
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">chevron_left</span>
            Newer
          </button>
          <span className="font-mono text-[13px] text-stone">Page {page}</span>
          <button disabled={!state.hasNext} onClick={() => setPage((p) => p + 1)} className="btn-ghost h-11 px-4">
            Older
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">chevron_right</span>
          </button>
        </nav>
      )}
    </div>
  );
}

export default function OrdersPage() {
  return (
    <>
      <Header />
      <main id="main" className="container-x min-h-[70vh] max-w-4xl pb-32 pt-[calc(var(--header-h)+40px)]">
        <PageHead eyebrow="Orders" title="Your" accent="orders" />
        <div className="mt-10">
          <RequireAuth>
            <OrdersList />
          </RequireAuth>
        </div>
      </main>
      <BottomNav />
    </>
  );
}
