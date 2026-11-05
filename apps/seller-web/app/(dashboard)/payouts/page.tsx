'use client';

import { useEffect, useState } from 'react';
import { useApiClient } from '@sthiva/web-core';
import { EmptyState, ErrorNote, PageHead, Pill, rupees, shortDate } from '../../../components/ui';
import { fetchPayouts, type Payouts, type Statement } from '../../../lib/settlements';

// What Sthiva owes the supplier for delivered orders, less cash they collected from buyers.
// Sthiva's team creates a statement, pays it, and marks it paid with the payment reference.

function Net({ net }: { net: number }) {
  if (net > 0) return <>Sthiva pays you <span className="tabular-nums">{rupees.format(net)}</span></>;
  if (net < 0) return <>You pay Sthiva <span className="tabular-nums">{rupees.format(-net)}</span></>;
  return <>Nothing due</>;
}

function StatementCard({ s }: { s: Statement }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="card flex flex-col gap-2 p-5">
      <div className="flex flex-wrap items-center gap-2">
        {s.status === 'PAID' ? <Pill tone="done">Paid</Pill> : <Pill tone="wait">Being paid</Pill>}
        <span className="font-mono text-[13px] text-stone">{s.number}</span>
      </div>
      <p className="text-[16px] font-semibold"><Net net={s.net} /></p>
      <p className="text-[14px] text-stone">
        Earned {rupees.format(s.earned)} · cash you collected {rupees.format(s.cashHeld)} · {shortDate.format(new Date(s.createdAt))}
      </p>
      {s.status === 'PAID' && <p className="text-[14px] text-stone">Reference <span className="font-mono">{s.reference}</span>{s.paidAt && <> · {shortDate.format(new Date(s.paidAt))}</>}</p>}
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="self-start text-[14px] font-medium text-cobalt hover:underline">
        {open ? 'Hide' : 'Show'} {s.orders.length} order{s.orders.length === 1 ? '' : 's'}
      </button>
      {open && (
        <ul className="flex flex-col gap-1 border-t border-sand-4 pt-2 text-[14px]">
          {s.orders.map((o) => (
            <li key={o.orderId} className="flex justify-between gap-3">
              <span className="font-mono">{o.orderNumber}</span>
              <span className="tabular-nums text-stone">{rupees.format(o.earned)}{o.cashHeld > 0 && <> · collected {rupees.format(o.cashHeld)}</>}</span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

export default function PayoutsPage() {
  const client = useApiClient();
  const [state, setState] = useState<{ status: 'loading' } | { status: 'error' } | { status: 'success'; data: Payouts }>({ status: 'loading' });

  useEffect(() => {
    let live = true;
    fetchPayouts(client).then((data) => live && setState({ status: 'success', data })).catch(() => live && setState({ status: 'error' }));
    return () => { live = false; };
  }, [client]);

  return (
    <div className="flex flex-col gap-6">
      <PageHead eyebrow="Money" title="Payouts">
        <p className="max-w-sm text-[15px] text-stone">Your earnings on delivered orders, less any cash you collected from buyers.</p>
      </PageHead>

      {state.status === 'loading' && <div className="skeleton h-48" role="status" aria-label="Loading payouts" />}
      {state.status === 'error' && <ErrorNote>Couldn’t load your payouts. Check your connection and try again.</ErrorNote>}
      {state.status === 'success' && (
        <>
          <section className="card flex flex-col gap-2 p-5 sm:p-6">
            <p className="eyebrow text-stone">Not settled yet</p>
            {state.data.balance.orders > 0 ? (
              <>
                <p className="font-display text-2xl font-semibold"><Net net={state.data.balance.net} /></p>
                <p className="text-[14px] text-stone">
                  {state.data.balance.orders} delivered order{state.data.balance.orders === 1 ? '' : 's'} · earned {rupees.format(state.data.balance.earned)} · cash you collected {rupees.format(state.data.balance.cashHeld)}
                </p>
              </>
            ) : (
              <p className="text-[15px]">Nothing waiting right now.</p>
            )}
            {state.data.balance.waitingForCash > 0 && (
              <p className="text-[14px] text-stone">
                {state.data.balance.waitingForCash} delivered order{state.data.balance.waitingForCash === 1 ? '' : 's'} still need the cash confirmed on the Orders page before they count.
              </p>
            )}
          </section>

          <h2 className="font-display text-xl font-semibold tracking-tight">Statements</h2>
          {state.data.settlements.length === 0 ? (
            <EmptyState icon="receipt" title="No statements yet" body="Sthiva’s team sends a statement when it settles your delivered orders." />
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {state.data.settlements.map((s) => <StatementCard key={s._id} s={s} />)}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
