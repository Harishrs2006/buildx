'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { catalogItem, deliveryTimeLabel, useApiClient } from '@sthiva/web-core';
import { EmptyState, ErrorNote, PageHead, Pill, rupees } from '../../../components/ui';
import { DesignForm } from '../../../components/DesignForm';
import { PRICE_UNITS, deleteDesign, fetchMyDesigns, updateDesign, type SupplierDesign } from '../../../lib/designs';

const STATUS = {
  IN_REVIEW: { label: 'Sthiva is reviewing', tone: 'wait' },
  LIVE: { label: 'Live', tone: 'live' },
  REJECTED: { label: 'Needs changes', tone: 'bad' },
  HIDDEN: { label: 'Hidden', tone: 'muted' },
} as const;

function DesignRow({ d, onEdit, onChange }: { d: SupplierDesign; onEdit: () => void; onChange: () => void }) {
  const client = useApiClient();
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const s = STATUS[d.status];
  const unit = PRICE_UNITS.find((u) => u.value === d.priceUnit)?.label ?? '';
  async function act(fn: () => Promise<unknown>) {
    setBusy(true);
    try { await fn(); onChange(); } finally { setBusy(false); }
  }
  return (
    <li className="card flex flex-col gap-4 p-4 sm:flex-row sm:p-5">
      <div className="relative h-36 w-full shrink-0 overflow-hidden rounded-xl bg-sand-3 sm:h-28 sm:w-40">
        {d.images[0] && <Image src={d.images[0].url} alt="" fill sizes="160px" className="object-cover" />}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-display text-[18px] font-semibold leading-tight">{d.title}</p>
          <Pill tone={s.tone}>{s.label}</Pill>
        </div>
        <p className="text-[14px] text-stone">
          {catalogItem(d.kind)?.name ?? d.kind} · {d.style} · from {rupees.format(d.priceFrom)} {unit} · usually {deliveryTimeLabel(d.leadDays.min, d.leadDays.max).toLowerCase()}
        </p>
        {d.status === 'REJECTED' && d.reviewNote && (
          <p className="rounded-lg bg-error-container px-3 py-2 text-[14px] text-on-error-container">Sthiva: {d.reviewNote}</p>
        )}
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onEdit} className="btn-ghost h-10 px-3 text-[14px]">Edit</button>
          {d.status === 'LIVE' && <button type="button" disabled={busy} onClick={() => act(() => updateDesign(client, d._id, { status: 'HIDDEN' }))} className="btn-ghost h-10 px-3 text-[14px]">Hide</button>}
          {d.status === 'HIDDEN' && <button type="button" disabled={busy} onClick={() => act(() => updateDesign(client, d._id, { status: 'LIVE' }))} className="btn-ghost h-10 px-3 text-[14px]">Show again</button>}
          {confirmDelete ? (
            <>
              <button type="button" disabled={busy} onClick={() => act(() => deleteDesign(client, d._id))} className="btn h-10 bg-error px-3 text-[14px] text-white">Yes, delete</button>
              <button type="button" onClick={() => setConfirmDelete(false)} className="btn-ghost h-10 px-3 text-[14px]">Keep</button>
            </>
          ) : (
            <button type="button" onClick={() => setConfirmDelete(true)} className="btn-ghost h-10 px-3 text-[14px] text-error">Delete</button>
          )}
        </div>
      </div>
    </li>
  );
}

export default function DesignsPage() {
  const client = useApiClient();
  const [state, setState] = useState<{ status: 'loading' } | { status: 'error' } | { status: 'success'; designs: SupplierDesign[] }>({ status: 'loading' });
  const [editing, setEditing] = useState<SupplierDesign | 'new' | null>(null);
  const load = useCallback(() => {
    fetchMyDesigns(client)
      .then((designs) => setState({ status: 'success', designs }))
      .catch(() => setState({ status: 'error' }));
  }, [client]);
  useEffect(load, [load]);

  return (
    <div className="flex flex-col gap-6">
      <PageHead eyebrow="Design catalogue" title="Your designs">
        {editing === null && <button type="button" onClick={() => setEditing('new')} className="btn-lime">Add a design</button>}
      </PageHead>
      <p className="max-w-2xl text-[15px] text-stone">
        Show buyers kitchens, wardrobes, ceilings or tile work you have done. They ask you for a quote; you call them, then send a price and date under Enquiries.
      </p>

      {editing !== null && (
        <DesignForm
          start={editing === 'new' ? undefined : editing}
          onCancel={() => setEditing(null)}
          onDone={() => { setEditing(null); load(); }}
        />
      )}

      {state.status === 'loading' && <div className="skeleton h-[140px]" role="status" aria-label="Loading designs" />}
      {state.status === 'error' && <ErrorNote>Could not load your designs. Try again.</ErrorNote>}
      {state.status === 'success' && state.designs.length === 0 && editing === null && (
        <EmptyState icon="design_services" title="No designs yet" body="Add photos of work you have done. Buyers who like a design send you an enquiry." />
      )}
      {state.status === 'success' && state.designs.length > 0 && (
        <ul className="flex flex-col gap-3">
          {state.designs.map((d) => <DesignRow key={d._id} d={d} onEdit={() => setEditing(d)} onChange={load} />)}
        </ul>
      )}
    </div>
  );
}
