'use client';

import { useState } from 'react';
import { useApiClient } from '@sthiva/web-core';
import { Chip, ChipRow, EmptyState, ErrorNote, PageHead, Pill, rupees, shortDate } from '../../../components/ui';
import { useAuth } from '../../../components/auth/AuthProvider';
import { errorText, settlementApi, useLoad, type Balance, type Party, type Settlement } from '../../../lib/ops';

// Money between Sthiva and its suppliers and drivers. A statement nets what they earned on delivered
// orders against buyer cash they kept. Admins create it, pay (or collect) outside the app, then mark it paid.

function Net({ net }: { net: number }) {
  if (net > 0) return <span className="font-semibold">Sthiva pays {rupees.format(net)}</span>;
  if (net < 0) return <span className="font-semibold text-error">They pay Sthiva {rupees.format(-net)}</span>;
  return <span className="font-semibold text-stone">Nothing due</span>;
}

function BalanceCard({ b, canEdit, onDone }: { b: Balance; canEdit: boolean; onDone: () => void }) {
  const client = useApiClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const create = async () => {
    setBusy(true);
    setError(null);
    try { await settlementApi.create(client, b.party, b.partyId); onDone(); } catch (err) { setError(errorText(err)); } finally { setBusy(false); }
  };
  return (
    <li className="card flex flex-col gap-3 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[16px] font-semibold">{b.partyName}</p>
        {b.waitingForCash > 0 && <Pill tone="wait">{b.waitingForCash} waiting for cash confirmation</Pill>}
      </div>
      {b.orders > 0 ? (
        <>
          <dl className="grid grid-cols-3 gap-2 text-[14px]">
            <div><dt className="text-stone">Orders</dt><dd className="font-mono">{b.orders}</dd></div>
            <div><dt className="text-stone">Earned</dt><dd className="tabular-nums">{rupees.format(b.earned)}</dd></div>
            <div><dt className="text-stone">Cash they kept</dt><dd className="tabular-nums">{rupees.format(b.cashHeld)}</dd></div>
          </dl>
          <p className="text-[15px]"><Net net={b.net} /></p>
          {canEdit && <button type="button" disabled={busy} onClick={create} className="btn-lime self-start px-4">{busy ? 'Creating' : 'Create statement'}</button>}
        </>
      ) : (
        <p className="text-[14px] text-stone">Orders join a statement once the cash for them is confirmed.</p>
      )}
      {error && <p className="text-[13px] text-error">{error}</p>}
    </li>
  );
}

function StatementCard({ s, canEdit, onDone }: { s: Settlement; canEdit: boolean; onDone: () => void }) {
  const client = useApiClient();
  const [mode, setMode] = useState<'idle' | 'pay' | 'cancel'>('idle');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      if (mode === 'pay') await settlementApi.markPaid(client, s._id, text);
      else await settlementApi.cancel(client, s._id, text);
      setMode('idle');
      setText('');
      onDone();
    } catch (err) { setError(errorText(err)); } finally { setBusy(false); }
  };
  return (
    <li className="card flex flex-col gap-3 p-5">
      <div className="flex flex-wrap items-center gap-2">
        {s.status === 'PENDING' && <Pill tone="wait">Not paid yet</Pill>}
        {s.status === 'PAID' && <Pill tone="done">Paid</Pill>}
        {s.status === 'CANCELLED' && <Pill tone="muted">Cancelled</Pill>}
        <span className="font-mono text-[13px] text-stone">{s.number}</span>
      </div>
      <div>
        <p className="text-[16px] font-semibold">{s.partyName}</p>
        <p className="text-[13px] text-stone">{s.party === 'SUPPLIER' ? 'Supplier' : 'Driver'} · {shortDate.format(new Date(s.createdAt))}</p>
      </div>
      <p className="text-[15px]"><Net net={s.net} /></p>
      <p className="text-[13px] text-stone">Earned {rupees.format(s.earned)} · cash they kept {rupees.format(s.cashHeld)}</p>
      {s.status === 'PAID' && <p className="text-[13px] text-stone">Reference <span className="font-mono">{s.reference}</span>{s.paidAt && <> · {shortDate.format(new Date(s.paidAt))}</>}</p>}
      {s.status === 'CANCELLED' && s.cancelReason && <p className="text-[13px] text-stone">Reason: {s.cancelReason}</p>}

      <button type="button" onClick={() => setOpen((v) => !v)} className="self-start text-[14px] font-medium text-cobalt hover:underline" aria-expanded={open}>
        {open ? 'Hide' : 'Show'} {s.orders.length} order{s.orders.length === 1 ? '' : 's'}
      </button>
      {open && (
        <ul className="flex flex-col gap-1 border-t border-sand-4 pt-2 text-[13px]">
          {s.orders.map((o) => (
            <li key={o.orderId} className="flex justify-between gap-3">
              <span className="font-mono">{o.orderNumber}</span>
              <span className="tabular-nums text-stone">{rupees.format(o.earned)}{o.cashHeld > 0 && <> · kept {rupees.format(o.cashHeld)}</>}</span>
            </li>
          ))}
        </ul>
      )}

      {canEdit && s.status === 'PENDING' && (mode === 'idle' ? (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setMode('pay')} className="btn-lime px-4">Mark paid</button>
          <button type="button" onClick={() => setMode('cancel')} className="btn-ghost">Cancel statement</button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <label className="text-[13px] font-medium" htmlFor={`t-${s._id}`}>
            {mode === 'pay' ? 'Payment reference (UPI or bank reference, or "cash")' : 'Why cancel? Its orders go back to the balance.'}
          </label>
          <input id={`t-${s._id}`} value={text} onChange={(e) => setText(e.target.value)} className="field" maxLength={mode === 'pay' ? 100 : 500} />
          <div className="flex gap-2">
            <button type="button" disabled={busy || text.trim().length < (mode === 'pay' ? 2 : 3)} onClick={submit} className="btn-lime px-4">
              {mode === 'pay' ? 'Confirm paid' : 'Confirm cancel'}
            </button>
            <button type="button" disabled={busy} onClick={() => { setMode('idle'); setText(''); }} className="btn-ghost">Back</button>
          </div>
        </div>
      ))}
      {error && <p className="text-[13px] text-error">{error}</p>}
    </li>
  );
}

export default function PayoutsPage() {
  const { user } = useAuth();
  const canEdit = user?.role === 'ADMIN';
  const [party, setParty] = useState<Party>('SUPPLIER');
  const [status, setStatus] = useState<'PENDING' | 'PAID' | 'CANCELLED'>('PENDING');
  const bal = useLoad((c) => settlementApi.balances(c, party), [party]);
  const list = useLoad((c) => settlementApi.list(c, { party, status }), [party, status]);
  const reload = () => { bal.reload(); list.reload(); };

  return (
    <div className="flex flex-col gap-8">
      <PageHead eyebrow="Money" title="Payouts">
        <p className="max-w-sm text-[15px] text-stone">
          What Sthiva owes each {party === 'SUPPLIER' ? 'supplier' : 'driver'} for delivered orders, less buyer cash they kept.
          {!canEdit && ' Only an admin can create statements or mark them paid.'}
        </p>
      </PageHead>

      <ChipRow label="Who">
        <Chip active={party === 'SUPPLIER'} onClick={() => setParty('SUPPLIER')}>Suppliers</Chip>
        <Chip active={party === 'DRIVER'} onClick={() => setParty('DRIVER')}>Drivers</Chip>
      </ChipRow>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-xl font-semibold tracking-tight">Not settled yet</h2>
        {bal.state.status === 'loading' && <div className="skeleton h-40" role="status" aria-label="Loading balances" />}
        {bal.state.status === 'error' && <ErrorNote>{errorText(bal.state.error, 'Couldn’t load balances.')}</ErrorNote>}
        {bal.state.status === 'success' && (bal.state.data.length === 0 ? (
          <EmptyState icon="task_alt" title="All settled" body="Delivered orders show up here once their cash is confirmed." />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {bal.state.data.map((b) => <BalanceCard key={b.partyId} b={b} canEdit={canEdit} onDone={reload} />)}
          </ul>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-xl font-semibold tracking-tight">Statements</h2>
        <ChipRow label="Status">
          <Chip active={status === 'PENDING'} onClick={() => setStatus('PENDING')}>Not paid</Chip>
          <Chip active={status === 'PAID'} onClick={() => setStatus('PAID')}>Paid</Chip>
          <Chip active={status === 'CANCELLED'} onClick={() => setStatus('CANCELLED')}>Cancelled</Chip>
        </ChipRow>
        {list.state.status === 'loading' && <div className="skeleton h-40" role="status" aria-label="Loading statements" />}
        {list.state.status === 'error' && <ErrorNote>{errorText(list.state.error, 'Couldn’t load statements.')}</ErrorNote>}
        {list.state.status === 'success' && (list.state.data.length === 0 ? (
          <EmptyState icon="receipt" title="No statements here" body="Statements you create appear in this list." />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {list.state.data.map((s) => <StatementCard key={s._id} s={s} canEdit={canEdit} onDone={reload} />)}
          </ul>
        ))}
      </section>
    </div>
  );
}
