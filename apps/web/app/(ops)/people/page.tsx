'use client';

import { useState } from 'react';
import { useApiClient } from '@sthiva/web-core';
import { Chip, ChipRow, EmptyState, ErrorNote, PageHead, Pager, Pill, shortDate } from '../../../components/ui';
import { useAuth } from '../../../components/auth/AuthProvider';
import { ROLES, errorText, peopleApi, useLoad, type Person, type Role } from '../../../lib/ops';

// Every account on Sthiva. Admins can suspend an account (it can't sign in or act) and reinstate it.
// Supplier and driver checks stay on their own tabs.

const ROLE_LABEL: Record<Role, string> = {
  BUYER: 'Buyer', SUPPLIER: 'Supplier', DELIVERY_PARTNER: 'Driver', OPERATOR: 'Operator', ADMIN: 'Admin',
};

function Suspend({ p, onDone }: { p: Person; onDone: () => void }) {
  const client = useApiClient();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    setBusy(true);
    setError(null);
    try { await peopleApi.setActive(client, p._id, !p.isActive, reason.trim()); setOpen(false); setReason(''); onDone(); }
    catch (err) { setError(errorText(err)); } finally { setBusy(false); }
  };
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={p.isActive ? 'btn-ghost text-error' : 'btn-ghost'}>
        {p.isActive ? 'Suspend' : 'Reinstate'}
      </button>
    );
  }
  return (
    <div className="flex w-full flex-col gap-2">
      <label htmlFor={`r-${p._id}`} className="text-[13px] font-medium">
        {p.isActive ? 'Why suspend? They will not be able to use Sthiva.' : 'Why reinstate?'}
      </label>
      <input id={`r-${p._id}`} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} className="field" />
      <div className="flex gap-2">
        <button type="button" disabled={busy || reason.trim().length < 3} onClick={submit} className="btn-lime px-4">
          {p.isActive ? 'Confirm suspend' : 'Confirm reinstate'}
        </button>
        <button type="button" disabled={busy} onClick={() => { setOpen(false); setReason(''); }} className="btn-ghost">Back</button>
      </div>
      {error && <p className="text-[13px] text-error">{error}</p>}
    </div>
  );
}

export default function PeoplePage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [role, setRole] = useState<Role | undefined>();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const { state, reload } = useLoad((c) => peopleApi.list(c, { role, q: q || undefined, page }), [role, q, page]);

  return (
    <div className="flex flex-col gap-6">
      <PageHead eyebrow="Accounts" title="People">
        <form role="search" onSubmit={(e) => { e.preventDefault(); setPage(1); setQ(search.trim()); }} className="flex w-full gap-2 sm:w-auto">
          <input value={search} onChange={(e) => setSearch(e.target.value.slice(0, 60))} placeholder="Name, phone or email" className="field sm:w-64" aria-label="Search people" />
          <button type="submit" className="btn-ink shrink-0 px-5">Find</button>
        </form>
      </PageHead>

      <ChipRow label="Filter by role">
        <Chip active={!role} onClick={() => { setRole(undefined); setPage(1); }}>Everyone</Chip>
        {ROLES.map((r) => <Chip key={r} active={role === r} onClick={() => { setRole(r); setPage(1); }}>{ROLE_LABEL[r]}s</Chip>)}
      </ChipRow>

      {state.status === 'loading' && <div className="skeleton h-80" role="status" aria-label="Loading people" />}
      {state.status === 'error' && <ErrorNote>{errorText(state.error, 'Couldn’t load people.')}</ErrorNote>}
      {state.status === 'success' && (
        <>
          {state.data.data.length === 0 ? (
            <EmptyState icon="group" title="Nobody found" body={q ? `No account matches “${q}”.` : 'No accounts with this role yet.'} />
          ) : (
            <ul className="card divide-y divide-sand-4 px-5">
              {state.data.data.map((p) => (
                <li key={p._id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[16px] font-semibold">{p.name}</p>
                      <Pill tone="muted">{ROLE_LABEL[p.role]}</Pill>
                      {!p.isActive && <Pill tone="bad">Suspended</Pill>}
                    </div>
                    <p className="mt-0.5 text-[14px] text-stone">
                      {p.phone && <a href={`tel:${p.phone}`} className="font-mono text-cobalt hover:underline">{p.phone}</a>}
                      {p.phone && p.email && ' · '}
                      {p.email}
                      {' · joined '}{shortDate.format(new Date(p.createdAt))}
                      {typeof p.orders === 'number' && <> · {p.orders} order{p.orders === 1 ? '' : 's'}, {p.delivered} delivered</>}
                    </p>
                  </div>
                  {isAdmin && p.role !== 'ADMIN' && p._id !== user?.id && <Suspend p={p} onDone={reload} />}
                </li>
              ))}
            </ul>
          )}
          <Pager page={state.data.meta.page} totalPages={state.data.meta.totalPages} hasPrev={state.data.meta.hasPrev} hasNext={state.data.meta.hasNext} onPage={setPage} />
        </>
      )}
    </div>
  );
}
