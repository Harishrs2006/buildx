'use client';

import { useState } from 'react';
import { useApiClient } from '@buildx/web-core';
import { useSupplierOrders, updateSupplierOrderStatus, type SupplierOrder, type SupplierOrderAction } from '../../../lib/orders';
import { Chip, ChipRow, EmptyState, ErrorNote, ORDER_STATUS, PageHead, Pager, Pill, rupees, shortDate } from '../../../components/ui';

const FILTERS: { value: string | undefined; label: string }[] = [
  { value: undefined, label: 'All' },
  { value: 'PENDING', label: 'New' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'READY_FOR_PICKUP', label: 'Ready for pickup' },
  { value: 'IN_TRANSIT', label: 'Out for delivery' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

function OrderCard({ order, onAction }: { order: SupplierOrder; onAction: (id: string, action: SupplierOrderAction) => Promise<string | null> }) {
  const [busy, setBusy] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const status = ORDER_STATUS[order.status];
  const open = order.status === 'PENDING' || order.status === 'CONFIRMED';

  async function act(action: SupplierOrderAction) {
    setBusy(true);
    setError(null);
    const err = await onAction(order._id, action);
    if (err) setError(err);
    setBusy(false);
    setConfirmCancel(false);
  }

  return (
    <article className={`card overflow-hidden ${order.status === 'PENDING' ? 'ring-2 ring-lime' : ''}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sand-4 px-5 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono text-[15px] font-medium">{order.orderNumber}</span>
          <Pill tone={status.tone} pulse={order.status === 'PENDING'}>{status.label}</Pill>
        </div>
        <span className="font-mono text-[12px] text-stone">{shortDate.format(new Date(order.createdAt))}</span>
      </div>

      <div className="grid gap-5 px-5 py-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div>
          <p className="eyebrow text-stone">Items</p>
          <ul className="mt-2 flex flex-col gap-1.5 text-[15px]">
            {order.items.map((item, i) => (
              <li key={i} className="flex justify-between gap-4">
                <span><span className="font-mono">{item.quantity}</span> <span className="text-stone">{item.unit.toLowerCase()} ×</span> {item.name}</span>
                <span className="shrink-0 tabular-nums">{rupees.format(item.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-baseline justify-between border-t border-sand-4 pt-3">
            <span className="text-[14px] text-stone">Total incl. GST · cash on delivery</span>
            <span className="font-display text-xl font-bold tabular-nums">{rupees.format(order.total)}</span>
          </div>
        </div>

        <div className="rounded-xl bg-sand-3/60 p-4 text-[15px]">
          <p className="eyebrow text-stone">Deliver to</p>
          <p className="mt-2 font-semibold">{order.buyerId?.name ?? 'Buyer'} · {order.deliveryAddress.label}</p>
          <p className="mt-0.5 text-stone">{order.deliveryAddress.fullAddress}</p>
          <a href={`tel:${order.deliveryAddress.contactPhone}`} className="mt-2 inline-flex items-center gap-1.5 font-mono text-[14px] text-cobalt hover:underline">
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">call</span>
            {order.deliveryAddress.contactPhone}
          </a>
          {order.deliveryMode && (
            <p className="mt-2 text-[13px] text-stone">
              {order.deliveryMode === 'SUPPLIER' ? 'You are delivering this order.' : 'A BuildX delivery partner collects this order.'}
            </p>
          )}
        </div>
      </div>

      {(open || order.status === 'IN_TRANSIT' || error) && (
        <div className="flex flex-col gap-3 border-t border-sand-4 bg-sand px-5 py-4">
          {error && <p role="alert" className="text-[14px] text-error">{error}</p>}
          {open && !confirmCancel && (
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={busy} onClick={() => act('READY_FOR_PICKUP')} className="btn-ink">
                <span className="material-symbols-outlined text-[20px]" aria-hidden="true">local_shipping</span>
                Ready for BuildX pickup
              </button>
              <button type="button" disabled={busy} onClick={() => act('IN_TRANSIT')} className="btn-ghost">
                I&apos;ll deliver it myself
              </button>
              <button type="button" disabled={busy} onClick={() => setConfirmCancel(true)} className="btn-ghost text-error hover:bg-error-container sm:ml-auto">
                Cancel order
              </button>
            </div>
          )}
          {open && confirmCancel && (
            <div role="alertdialog" aria-label="Cancel this order?" className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <p className="flex-1 text-[15px]"><span className="font-semibold">Cancel {order.orderNumber}?</span> The buyer is told and the stock goes back to your listing.</p>
              <div className="flex gap-2">
                <button type="button" disabled={busy} onClick={() => act('CANCELLED')} className="btn bg-error text-white hover:bg-[#A51F24]">Yes, cancel</button>
                <button type="button" disabled={busy} onClick={() => setConfirmCancel(false)} className="btn-ghost">Keep it</button>
              </div>
            </div>
          )}
          {order.status === 'IN_TRANSIT' && (
            <button type="button" disabled={busy} onClick={() => act('DELIVERED')} className="btn-lime self-start">
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">task_alt</span>
              Mark as delivered
            </button>
          )}
        </div>
      )}
    </article>
  );
}

export default function OrdersPage() {
  const client = useApiClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string | undefined>(undefined);
  const list = useSupplierOrders(page, status);

  async function handleAction(id: string, action: SupplierOrderAction): Promise<string | null> {
    try {
      await updateSupplierOrderStatus(client, id, action);
      list.reload();
      return null;
    } catch (err) {
      return err instanceof Error ? err.message : 'Could not update the order. Try again.';
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHead eyebrow="Orders" title="Incoming orders" />

      <ChipRow label="Filter orders">
        {FILTERS.map((f) => (
          <Chip key={f.label} active={status === f.value} onClick={() => { setStatus(f.value); setPage(1); }}>{f.label}</Chip>
        ))}
      </ChipRow>

      {list.status === 'loading' && (
        <div className="flex flex-col gap-4" role="status" aria-label="Loading orders">
          {[0, 1, 2].map((i) => <div key={i} className="skeleton h-48" />)}
        </div>
      )}
      {list.status === 'error' && <ErrorNote>Couldn&apos;t load your orders. Check your connection and try again.</ErrorNote>}

      {list.status === 'success' && (
        <>
          {list.orders.length === 0 ? (
            <EmptyState
              icon="receipt_long"
              title={status ? 'Nothing here right now' : 'No orders yet'}
              body={status ? 'No orders with this status.' : 'When buyers order from your listings, the orders appear here to confirm and dispatch.'}
            />
          ) : (
            <div className="flex flex-col gap-4">
              {list.orders.map((o) => <OrderCard key={o._id} order={o} onAction={handleAction} />)}
            </div>
          )}
          <Pager page={list.meta.page} totalPages={list.meta.totalPages} hasPrev={list.meta.hasPrev} hasNext={list.meta.hasNext} onPage={setPage} />
        </>
      )}
    </div>
  );
}
