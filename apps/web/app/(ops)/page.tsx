'use client';

import Link from 'next/link';
import { ErrorNote, ORDER_STATUS, PageHead, Pill } from '../../components/ui';
import { OrderLine } from '../../components/OrderLine';
import { opsApi, useLoad, type OpsSummary, type OrderSummary } from '../../lib/ops';

type QueueKey = keyof OpsSummary['attention'];

// What each queue means and what to do about it, in the order ops should work through them
function queues(t: OpsSummary['thresholds']): { key: QueueKey; title: string; hint: string }[] {
  const hrs = (m: number) => (m % 60 === 0 ? `${m / 60} h` : `${m} min`);
  return [
    { key: 'unassigned', title: 'No driver yet', hint: `Ready for pickup for over ${hrs(t.READY_UNASSIGNED_MINUTES)}. Assign a driver.` },
    { key: 'notPickedUp', title: 'Driver has not picked up', hint: `Assigned for over ${hrs(t.ASSIGNED_MINUTES)}. Call the driver or reassign.` },
    { key: 'notDispatched', title: 'Supplier has not dispatched', hint: `Confirmed for over ${hrs(t.CONFIRMED_MINUTES)}. Call the supplier.` },
    { key: 'longInDelivery', title: 'Long time on the road', hint: `Picked up or in transit for over ${hrs(t.IN_DELIVERY_MINUTES)}. Check with the driver.` },
    { key: 'codPending', title: 'Cash not recorded', hint: 'Delivered cash orders where the full amount is not confirmed yet.' },
    { key: 'uncheckedDestination', title: 'Delivery PIN not checked', hint: 'Older app orders without a PIN. Confirm the supplier delivers there.' },
  ];
}

const FLOW = ['CONFIRMED', 'READY_FOR_PICKUP', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'] as const;

export default function TodayPage() {
  const { state } = useLoad(opsApi.summary, []);
  const pending = useLoad((c) => opsApi.suppliers(c, 'PENDING'), []);

  return (
    <div className="flex flex-col gap-8">
      <PageHead eyebrow="Operations" title={<>Today at <span className="font-serif font-normal italic">BuildX</span></>} />

      {pending.state.status === 'success' && pending.state.data.length > 0 && (
        <Link href="/suppliers" className="group flex flex-col gap-4 rounded-2xl bg-lime p-5 text-ink sm:flex-row sm:items-center">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-ink text-lime">
            <span className="material-symbols-outlined" aria-hidden="true">how_to_reg</span>
          </span>
          <span className="flex-1">
            <span className="block font-display text-lg font-semibold">
              {pending.state.data.length} supplier{pending.state.data.length === 1 ? '' : 's'} waiting for verification
            </span>
            <span className="block text-[15px] text-ink/75">Buyers can only order from verified suppliers.</span>
          </span>
          <span className="btn-ink self-start px-5 sm:self-auto">Review</span>
        </Link>
      )}

      {state.status === 'loading' && <div className="skeleton h-40" role="status" aria-label="Loading" />}
      {state.status === 'error' && <ErrorNote>Couldn&apos;t load today&apos;s numbers. Check your connection and refresh.</ErrorNote>}

      {state.status === 'success' && (
        <>
          <section aria-label="Orders by status" className="on-ink rounded-3xl bg-ink p-3 text-sand">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl bg-lime p-5 text-ink">
                <p className="font-display text-[clamp(1.75rem,4vw,2.5rem)] font-bold leading-none tabular-nums">{state.data.todayOrders}</p>
                <p className="mt-2 text-[14px]">Orders placed today</p>
              </div>
              {FLOW.slice(0, 3).map((s) => (
                <Link key={s} href={`/orders?status=${s}`} className="rounded-2xl bg-ink-2 p-5 transition-colors hover:bg-ink-3">
                  <p className="font-display text-[clamp(1.75rem,4vw,2.5rem)] font-bold leading-none tabular-nums">{state.data.counts[s] ?? 0}</p>
                  <p className="mt-2 text-[14px] text-stone-light">{ORDER_STATUS[s].label}</p>
                </Link>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2 px-2 pb-1">
              {FLOW.slice(3).map((s) => (
                <Link key={s} href={`/orders?status=${s}`} className="rounded-full bg-white/10 px-3 py-1.5 text-[13px] text-sand/80 hover:bg-white/20">
                  {ORDER_STATUS[s].label} <span className="font-mono text-sand">{state.data.counts[s] ?? 0}</span>
                </Link>
              ))}
            </div>
          </section>

          <section aria-labelledby="attention-title" className="flex flex-col gap-4">
            <h2 id="attention-title" className="font-display text-2xl font-semibold tracking-tight">Needs a person</h2>
            {queues(state.data.thresholds).every((q) => state.data.attention[q.key].length === 0) ? (
              <p className="card flex items-center gap-2 px-5 py-5 text-[15px] text-stone">
                <span className="material-symbols-outlined text-tertiary" aria-hidden="true">task_alt</span>
                Nothing is stuck right now.
              </p>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {queues(state.data.thresholds).map((q) => {
                  const orders: OrderSummary[] = state.data.attention[q.key];
                  if (orders.length === 0) return null;
                  return (
                    <div key={q.key} className="card p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-[16px] font-semibold">{q.title}</h3>
                          <p className="mt-0.5 text-[14px] text-stone">{q.hint}</p>
                        </div>
                        <Pill tone="bad">{orders.length}{orders.length === 20 ? '+' : ''}</Pill>
                      </div>
                      <ul className="mt-3 divide-y divide-sand-4">
                        {orders.slice(0, 6).map((o) => <OrderLine key={o._id} order={o} />)}
                      </ul>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
