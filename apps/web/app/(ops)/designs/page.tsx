'use client';

import { useState } from 'react';
import Image from 'next/image';
import { catalogItem, deliveryTimeLabel, useApiClient } from '@sthiva/web-core';
import { Chip, ChipRow, EmptyState, ErrorNote, PageHead, Pill, shortDate } from '../../../components/ui';
import { designsApi, errorText, useLoad, type OpsDesign } from '../../../lib/ops';

// Supplier designs wait here before buyers see them: check the photos are real work (no other
// company's logos or catalogue pictures), the words are honest and the price is plausible.

const UNIT: Record<string, string> = { PER_SQFT: 'per sq ft', PER_RUNNING_FT: 'per running ft', PER_PIECE: 'per piece', PER_BOX: 'per box' };
const TABS = [
  { status: 'IN_REVIEW', label: 'To review' },
  { status: 'LIVE', label: 'Live' },
  { status: 'REJECTED', label: 'Sent back' },
  { status: 'HIDDEN', label: 'Hidden by supplier' },
] as const;
const rupees = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

function Review({ d, onDone }: { d: OpsDesign; onDone: () => void }) {
  const client = useApiClient();
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const decide = async (status: 'LIVE' | 'REJECTED') => {
    setBusy(true);
    setError(null);
    try { await designsApi.review(client, d._id, status, status === 'REJECTED' ? note.trim() : undefined); onDone(); }
    catch (err) { setError(errorText(err)); } finally { setBusy(false); }
  };
  return (
    <div className="flex flex-col gap-2">
      {error && <p role="alert" className="text-[14px] text-error">{error}</p>}
      {rejecting ? (
        <>
          <label htmlFor={`n-${d._id}`} className="text-[13px] font-medium">What should the supplier change?</label>
          <input id={`n-${d._id}`} value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} className="field" placeholder="Photo shows another company's logo; please use your own photos." />
          <div className="flex gap-2">
            <button type="button" disabled={busy || note.trim().length < 3} onClick={() => decide('REJECTED')} className="btn-ink">Send back</button>
            <button type="button" onClick={() => setRejecting(false)} className="btn-ghost">Cancel</button>
          </div>
        </>
      ) : (
        <div className="flex flex-wrap gap-2">
          {d.status !== 'LIVE' && <button type="button" disabled={busy} onClick={() => decide('LIVE')} className="btn-ink">Approve</button>}
          {d.status !== 'REJECTED' && <button type="button" disabled={busy} onClick={() => setRejecting(true)} className="btn-ghost">{d.status === 'LIVE' ? 'Take down' : 'Send back'}</button>}
        </div>
      )}
    </div>
  );
}

export default function DesignsPage() {
  const [status, setStatus] = useState<string>('IN_REVIEW');
  const { state, reload } = useLoad((c) => designsApi.list(c, status), [status]);
  const enquiries = useLoad((c) => designsApi.enquiries(c), []);

  return (
    <div className="flex flex-col gap-6">
      <PageHead eyebrow="Design catalogue" title="Designs" />
      <ChipRow label="Status">
        {TABS.map((t) => <Chip key={t.status} active={status === t.status} onClick={() => setStatus(t.status)}>{t.label}</Chip>)}
      </ChipRow>

      {state.status === 'loading' && <div className="skeleton h-[200px]" role="status" aria-label="Loading designs" />}
      {state.status === 'error' && <ErrorNote>{errorText(state.error, 'Could not load designs.')}</ErrorNote>}
      {state.status === 'success' && state.data.length === 0 && (
        <EmptyState icon="design_services" title="Nothing here" body={status === 'IN_REVIEW' ? 'No designs are waiting for review.' : 'No designs with this status.'} />
      )}
      {state.status === 'success' && state.data.length > 0 && (
        <ul className="flex flex-col gap-4">
          {state.data.map((d) => (
            <li key={d._id} className="card flex flex-col gap-4 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-display text-xl font-semibold">{d.title}</p>
                <Pill tone={d.status === 'LIVE' ? 'live' : d.status === 'REJECTED' ? 'bad' : 'wait'}>{d.status.replace('_', ' ').toLowerCase()}</Pill>
              </div>
              <p className="text-[14px] text-stone">
                {d.supplierId?.businessName ?? 'Supplier'} · {catalogItem(d.kind)?.name ?? d.kind} · {d.style} · from {rupees.format(d.priceFrom)} {UNIT[d.priceUnit] ?? ''} · usually {deliveryTimeLabel(d.leadDays.min, d.leadDays.max).toLowerCase()} · updated {shortDate.format(new Date(d.updatedAt))}
              </p>
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {d.images.map((img) => (
                  <li key={img.publicId} className="relative aspect-[4/3] overflow-hidden rounded-xl bg-sand-3">
                    <a href={img.url} target="_blank" rel="noreferrer" aria-label="Open photo full size">
                      <Image src={img.url} alt="" fill sizes="25vw" className="object-cover" />
                    </a>
                  </li>
                ))}
              </ul>
              {(d.materials || d.description) && (
                <p className="whitespace-pre-line text-[15px]">{[d.materials, d.description].filter(Boolean).join('\n')}</p>
              )}
              {d.reviewNote && <p className="text-[14px] text-error">Sent back: {d.reviewNote}</p>}
              <Review d={d} onDone={reload} />
            </li>
          ))}
        </ul>
      )}

      <section className="flex flex-col gap-3" aria-labelledby="enq">
        <h2 id="enq" className="font-display text-2xl font-semibold">Buyer enquiries</h2>
        {enquiries.state.status === 'success' && enquiries.state.data.length === 0 && <p className="text-[15px] text-stone">No enquiries yet.</p>}
        {enquiries.state.status === 'success' && enquiries.state.data.length > 0 && (
          <div className="card overflow-x-auto">
            <table className="w-full text-left text-[14px]">
              <thead className="text-stone"><tr><th className="px-4 py-3 font-medium">When</th><th className="px-4 py-3 font-medium">Design</th><th className="px-4 py-3 font-medium">Supplier</th><th className="px-4 py-3 font-medium">Buyer</th><th className="px-4 py-3 font-medium">PIN</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium">Quote</th></tr></thead>
              <tbody>
                {enquiries.state.data.map((e) => (
                  <tr key={e._id} className="border-t border-sand-4">
                    <td className="px-4 py-3">{shortDate.format(new Date(e.createdAt))}</td>
                    <td className="px-4 py-3">{e.designTitle}</td>
                    <td className="px-4 py-3">{e.supplierId?.businessName ?? ''}</td>
                    <td className="px-4 py-3">{e.buyerId?.name ?? ''}</td>
                    <td className="px-4 py-3 font-mono">{e.sitePincode}</td>
                    <td className="px-4 py-3">{e.status.toLowerCase()}</td>
                    <td className="px-4 py-3 tabular-nums">{e.quote ? rupees.format(e.quote.amount) : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
