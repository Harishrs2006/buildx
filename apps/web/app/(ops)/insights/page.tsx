'use client';

import { useState } from 'react';
import { Chip, ChipRow, EmptyState, ErrorNote, PageHead, rupees } from '../../../components/ui';
import { errorText, peopleApi, useLoad, type Analytics } from '../../../lib/ops';

// How Sthiva is doing: sales and who earned what, orders over time, best-selling items, and how
// quickly suppliers and drivers take offers. Counted from real orders in India time.

const dayLabel = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card flex flex-col gap-1 p-5">
      <p className="eyebrow text-stone">{label}</p>
      <p className="font-display text-3xl font-bold tabular-nums">{value}</p>
      {hint && <p className="text-[13px] text-stone">{hint}</p>}
    </div>
  );
}

// One series (sales of delivered orders per day): one ink colour, no legend, thin bars with rounded
// tops on a shared baseline, hover/focus tooltip, and the same numbers in a table below.
function SalesChart({ series }: { series: Analytics['series'] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...series.map((d) => d.sales), 0);
  if (max === 0) return <p className="text-[15px] text-stone">No delivered orders in this period yet.</p>;
  const h = hover === null ? null : series[hover];
  return (
    <div className="flex flex-col gap-3">
      <p className="min-h-[22px] text-[14px] text-stone" aria-live="polite">
        {h ? <><span className="font-semibold text-ink">{dayLabel(h.date)}</span>: {rupees.format(h.sales)} from {h.delivered} delivered · {h.placed} placed</> : 'Point at a bar for that day.'}
      </p>
      <div className="flex h-48 items-end gap-[2px] border-b border-sand-4" role="img" aria-label={`Sales per day, highest ${rupees.format(max)}`}>
        {series.map((d, i) => (
          <button
            key={d.date}
            type="button"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(null)}
            aria-label={`${dayLabel(d.date)}: ${rupees.format(d.sales)}`}
            className="group flex h-full min-w-0 flex-1 items-end"
          >
            <span
              className={`block w-full rounded-t-[4px] ${hover === i ? 'bg-ink' : 'bg-ink/80'} ${d.sales === 0 ? 'opacity-0' : ''}`}
              style={{ height: `${Math.max(2, (d.sales / max) * 100)}%` }}
            />
          </button>
        ))}
      </div>
      <div className="flex justify-between text-[12px] text-stone">
        <span>{dayLabel(series[0].date)}</span>
        <span>{dayLabel(series[series.length - 1].date)}</span>
      </div>
      <details className="text-[14px]">
        <summary className="cursor-pointer font-medium text-cobalt">Show as a table</summary>
        <table className="mt-2 w-full text-left">
          <thead className="text-stone"><tr><th className="py-1 font-medium">Day</th><th className="font-medium">Placed</th><th className="font-medium">Delivered</th><th className="text-right font-medium">Sales</th></tr></thead>
          <tbody>
            {series.map((d) => (
              <tr key={d.date} className="border-t border-sand-4">
                <td className="py-1">{dayLabel(d.date)}</td><td className="tabular-nums">{d.placed}</td><td className="tabular-nums">{d.delivered}</td>
                <td className="text-right tabular-nums">{rupees.format(d.sales)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}

function RateTable({ rows, kind }: { rows: (Analytics['drivers'][number] & { sales?: number })[]; kind: 'supplier' | 'driver' }) {
  if (rows.length === 0) return <p className="text-[15px] text-stone">No {kind} activity in this period.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-left text-[14px]">
        <thead className="text-stone">
          <tr>
            <th className="py-2 font-medium">{kind === 'supplier' ? 'Supplier' : 'Driver'}</th>
            <th className="font-medium">Offers</th><th className="font-medium">Took</th>
            <th className="font-medium">{kind === 'supplier' ? 'Rejected' : 'Declined'}</th><th className="font-medium">No answer</th>
            <th className="font-medium">Delivered</th>
            {kind === 'supplier' && <th className="text-right font-medium">Sales</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-sand-4">
              <td className="py-2 font-medium">{r.name}</td>
              <td className="tabular-nums">{r.offers}</td>
              <td className="tabular-nums">{r.accepted}{r.acceptRate !== null && <span className="text-stone"> ({r.acceptRate}%)</span>}</td>
              <td className="tabular-nums">{r.rejected}</td>
              <td className="tabular-nums">{r.expired}</td>
              <td className="tabular-nums">{r.delivered}</td>
              {kind === 'supplier' && <td className="text-right tabular-nums">{rupees.format(r.sales ?? 0)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const CANCELLED_BY: Record<string, string> = { BUYER: 'buyers', SUPPLIER: 'suppliers', OPS: 'Sthiva team', SYSTEM: 'system', UNKNOWN: 'unknown' };

export default function InsightsPage() {
  const [days, setDays] = useState(30);
  const { state } = useLoad((c) => peopleApi.analytics(c, days), [days]);

  return (
    <div className="flex flex-col gap-6">
      <PageHead eyebrow="Numbers" title="Insights">
        <p className="max-w-sm text-[15px] text-stone">Sales count delivered orders. Offers count orders placed in the period.</p>
      </PageHead>

      <ChipRow label="Period">
        {[7, 30, 90].map((d) => <Chip key={d} active={days === d} onClick={() => setDays(d)}>Last {d} days</Chip>)}
      </ChipRow>

      {state.status === 'loading' && <div className="skeleton h-96" role="status" aria-label="Loading insights" />}
      {state.status === 'error' && <ErrorNote>{errorText(state.error, 'Couldn’t load insights.')}</ErrorNote>}
      {state.status === 'success' && (() => {
        const a = state.data;
        const t = a.totals;
        if (t.placed === 0 && t.delivered === 0) {
          return <EmptyState icon="monitoring" title="No orders in this period" body="Numbers appear here once buyers place orders." />;
        }
        const cancelNote = Object.entries(a.cancelledBy).map(([k, n]) => `${n} by ${CANCELLED_BY[k] ?? k.toLowerCase()}`).join(', ');
        return (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Sales" value={rupees.format(t.sales)} hint={`${t.delivered} delivered${t.averageOrder !== null ? ` · ${rupees.format(t.averageOrder)} average` : ''}`} />
              <Stat label="Sthiva's share" value={rupees.format(t.sthivaShare)} hint="Commission plus Sthiva's part of delivery charges" />
              <Stat label="Paid out to partners" value={rupees.format(t.supplierEarnings + t.driverEarnings)} hint={`Suppliers ${rupees.format(t.supplierEarnings)} · drivers ${rupees.format(t.driverEarnings)}`} />
              <Stat label="Orders placed" value={String(t.placed)} hint={t.cancelled ? `${t.cancelled} cancelled (${cancelNote})` : 'None cancelled'} />
            </div>

            <section className="card p-5 sm:p-6">
              <h2 className="font-display text-xl font-semibold tracking-tight">Sales per day</h2>
              <div className="mt-4"><SalesChart series={a.series} /></div>
            </section>

            <section className="card p-5 sm:p-6">
              <h2 className="font-display text-xl font-semibold tracking-tight">Best-selling items</h2>
              {a.topItems.length === 0 ? <p className="mt-3 text-[15px] text-stone">No delivered items in this period.</p> : (
                <ol className="mt-3 flex flex-col divide-y divide-sand-4 text-[15px]">
                  {a.topItems.map((it, i) => (
                    <li key={`${it.name}-${it.unit}`} className="flex justify-between gap-4 py-2">
                      <span><span className="font-mono text-stone">{i + 1}.</span> {it.name} <span className="text-stone">· {it.quantity.toLocaleString('en-IN')} {it.unit.toLowerCase()}</span></span>
                      <span className="tabular-nums">{rupees.format(it.sales)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <section className="card p-5 sm:p-6">
              <h2 className="font-display text-xl font-semibold tracking-tight">Suppliers</h2>
              <div className="mt-3"><RateTable rows={a.suppliers} kind="supplier" /></div>
            </section>

            <section className="card p-5 sm:p-6">
              <h2 className="font-display text-xl font-semibold tracking-tight">Drivers</h2>
              <div className="mt-3"><RateTable rows={a.drivers} kind="driver" /></div>
            </section>
          </>
        );
      })()}
    </div>
  );
}
