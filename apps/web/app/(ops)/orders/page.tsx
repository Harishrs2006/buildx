'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Chip, ChipRow, EmptyState, ErrorNote, ORDER_STATUS, PageHead, Pager } from '../../../components/ui';
import { OrderLine } from '../../../components/OrderLine';
import { ORDER_STATUSES, errorText, opsApi, useLoad, type OrderStatus } from '../../../lib/ops';

// PENDING and DISPUTED exist in the schema but nothing moves orders there yet
const FILTERS: (OrderStatus | undefined)[] = [undefined, ...ORDER_STATUSES.filter((s) => s !== 'PENDING' && s !== 'DISPUTED')];

function Orders() {
  const router = useRouter();
  const params = useSearchParams();
  const raw = params.get('status');
  const status = ORDER_STATUSES.includes(raw as OrderStatus) ? (raw as OrderStatus) : undefined;
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const { state } = useLoad((c) => opsApi.orders(c, { status, q: q || undefined, page }), [status, q, page]);

  const pick = (s?: OrderStatus) => {
    setPage(1);
    router.replace(s ? `/orders?status=${s}` : '/orders');
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHead eyebrow="Orders" title="All orders">
        <form
          role="search"
          onSubmit={(e) => { e.preventDefault(); setPage(1); setQ(search.trim()); }}
          className="flex w-full gap-2 sm:w-auto"
        >
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value.replace(/[^A-Za-z0-9-]/g, '').slice(0, 40))}
            placeholder="Order number, e.g. BX-M1K2"
            className="field font-mono sm:w-64"
            aria-label="Search by order number"
          />
          <button type="submit" className="btn-ink shrink-0 px-5">Find</button>
        </form>
      </PageHead>

      <ChipRow label="Filter orders">
        {FILTERS.map((s) => (
          <Chip key={s ?? 'all'} active={status === s} onClick={() => pick(s)}>{s ? ORDER_STATUS[s].label : 'All'}</Chip>
        ))}
      </ChipRow>

      {state.status === 'loading' && <div className="skeleton h-80" role="status" aria-label="Loading orders" />}
      {state.status === 'error' && <ErrorNote>{errorText(state.error, 'Couldn’t load orders.')}</ErrorNote>}
      {state.status === 'success' && (
        <>
          {state.data.data.length === 0 ? (
            <EmptyState icon="receipt_long" title="No orders" body={q ? `No order number starts with ${q.toUpperCase()}.` : 'No orders with this status.'} />
          ) : (
            <ul className="card divide-y divide-sand-4 px-5">
              {state.data.data.map((o) => <OrderLine key={o._id} order={o} />)}
            </ul>
          )}
          <Pager page={state.data.meta.page} totalPages={state.data.meta.totalPages} hasPrev={state.data.meta.hasPrev} hasNext={state.data.meta.hasNext} onPage={setPage} />
        </>
      )}
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<div className="skeleton h-80" />}>
      <Orders />
    </Suspense>
  );
}
