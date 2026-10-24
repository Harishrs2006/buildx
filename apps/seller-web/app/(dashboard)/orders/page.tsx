'use client';

import { useState } from 'react';
import { useApiClient } from '@buildx/web-core';
import { useSupplierOrders, updateSupplierOrderStatus, type SupplierOrder, type SupplierOrderAction } from '../../../lib/orders';

const STATUS_FILTERS = ['PENDING', 'CONFIRMED', 'READY_FOR_PICKUP', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'] as const;

function OrderActions({ order, onAction }: { order: SupplierOrder; onAction: (action: SupplierOrderAction) => void }) {
  if (order.status === 'PENDING' || order.status === 'CONFIRMED') {
    return (
      <div className="flex flex-wrap gap-2">
        <button onClick={() => onAction('READY_FOR_PICKUP')} className="rounded-lg bg-primary-container px-3 py-2 font-body text-xs font-bold uppercase text-on-primary-container">
          Dispatch via BuildX driver
        </button>
        <button onClick={() => onAction('IN_TRANSIT')} className="rounded-lg bg-surface-container-high px-3 py-2 font-body text-xs font-bold uppercase text-on-surface">
          I'll deliver myself
        </button>
        <button onClick={() => onAction('CANCELLED')} className="rounded-lg bg-error-container px-3 py-2 font-body text-xs font-bold uppercase text-on-error-container">
          Cancel
        </button>
      </div>
    );
  }
  if (order.status === 'IN_TRANSIT') {
    return (
      <button onClick={() => onAction('DELIVERED')} className="rounded-lg bg-primary px-3 py-2 font-body text-xs font-bold uppercase text-on-primary">
        Mark delivered
      </button>
    );
  }
  return null;
}

function OrderCard({ order, onAction }: { order: SupplierOrder; onAction: (id: string, action: SupplierOrderAction) => void }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-surface-container-low p-4">
      <div className="flex items-center justify-between">
        <span className="font-body text-sm font-semibold text-on-surface">{order.orderNumber}</span>
        <span className="rounded-full bg-surface-container-high px-2.5 py-1 font-body text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">
          {order.status.replace('_', ' ')}
        </span>
      </div>
      <p className="font-body text-xs text-on-surface-variant">
        {order.buyerId?.name ?? 'Buyer'} · {order.deliveryAddress.fullAddress}
      </p>
      <ul className="font-body text-sm text-on-surface">
        {order.items.map((item, i) => (
          <li key={i}>{item.quantity} {item.unit} × {item.name}</li>
        ))}
      </ul>
      <div className="flex items-center justify-between">
        <span className="font-headline text-lg font-bold text-on-surface">₹{order.total.toLocaleString('en-IN')}</span>
        <OrderActions order={order} onAction={(action) => onAction(order._id, action)} />
      </div>
    </div>
  );
}

export default function OrdersPage() {
  const client = useApiClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string | undefined>(undefined);
  const list = useSupplierOrders(page, status);

  async function handleAction(id: string, action: SupplierOrderAction) {
    if (action === 'CANCELLED' && !confirm('Cancel this order? Stock will be restored.')) return;
    try {
      await updateSupplierOrderStatus(client, id, action);
      list.reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not update the order');
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-headline text-2xl font-bold text-on-surface">Orders</h1>

      <div className="flex flex-wrap gap-2">
        {([undefined, ...STATUS_FILTERS] as const).map((s) => (
          <button
            key={s ?? 'ALL'}
            onClick={() => { setStatus(s); setPage(1); }}
            className={
              status === s
                ? 'rounded-full bg-primary px-3.5 py-1.5 font-body text-xs font-semibold text-on-primary'
                : 'rounded-full bg-surface-container-high px-3.5 py-1.5 font-body text-xs font-semibold text-on-surface-variant'
            }
          >
            {s?.replace('_', ' ') ?? 'All'}
          </button>
        ))}
      </div>

      {list.status === 'loading' && <p className="font-body text-sm text-on-surface-variant">Loading…</p>}
      {list.status === 'error' && <p className="font-body text-sm text-error">Couldn't load your orders.</p>}

      {list.status === 'success' && (
        <>
          {list.orders.length === 0 ? (
            <p className="rounded-xl bg-surface-container-low p-6 text-center font-body text-sm text-on-surface-variant">
              No orders here yet.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {list.orders.map((o) => (
                <OrderCard key={o._id} order={o} onAction={handleAction} />
              ))}
            </div>
          )}

          {list.meta.totalPages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <button disabled={!list.meta.hasPrev} onClick={() => setPage((p) => p - 1)} className="rounded-lg bg-surface-container-high px-3 py-2 disabled:opacity-40">
                <span className="material-symbols-outlined text-lg">chevron_left</span>
              </button>
              <span className="font-body text-sm text-on-surface-variant">Page {list.meta.page} of {list.meta.totalPages}</span>
              <button disabled={!list.meta.hasNext} onClick={() => setPage((p) => p + 1)} className="rounded-lg bg-surface-container-high px-3 py-2 disabled:opacity-40">
                <span className="material-symbols-outlined text-lg">chevron_right</span>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
