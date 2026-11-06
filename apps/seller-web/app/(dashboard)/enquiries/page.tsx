'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { formatDeliveryDate, istDate, useApiClient } from '@sthiva/web-core';
import { EmptyState, ErrorNote, PageHead, Pill, rupees, shortDate } from '../../../components/ui';
import { DeliveryDatePicker } from '../../../components/DeliveryDatePicker';
import { productErrorText } from '../../../lib/products';
import { fetchEnquiries, updateEnquiry, type Enquiry } from '../../../lib/designs';

const STATUS = {
  NEW: { label: 'New', tone: 'live' },
  CONTACTED: { label: 'Contacted', tone: 'active' },
  QUOTED: { label: 'Quote sent', tone: 'wait' },
  ACCEPTED: { label: 'Buyer accepted', tone: 'done' },
  CLOSED: { label: 'Closed', tone: 'muted' },
} as const;

const waNumber = (p: string) => `91${p.replace(/\D/g, '').slice(-10)}`;

function EnquiryCard({ e, onChange }: { e: Enquiry; onChange: () => void }) {
  const client = useApiClient();
  const [quoting, setQuoting] = useState(false);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(istDate(14));
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const open = e.status === 'NEW' || e.status === 'CONTACTED' || e.status === 'QUOTED';

  async function send(body: Parameters<typeof updateEnquiry>[2]) {
    setBusy(true);
    setError(null);
    try {
      await updateEnquiry(client, e._id, body);
      setQuoting(false);
      onChange();
    } catch (err) {
      setError(productErrorText(err, 'Could not update. Try again.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="card flex flex-col overflow-hidden">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:p-5">
        <div className="relative h-28 w-full shrink-0 overflow-hidden rounded-xl bg-sand-3 sm:w-36">
          {e.designImage && <Image src={e.designImage} alt="" fill sizes="144px" className="object-cover" />}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-display text-[18px] font-semibold leading-tight">{e.designTitle}</p>
            <Pill tone={STATUS[e.status].tone}>{STATUS[e.status].label}</Pill>
          </div>
          <p className="text-[14px] text-stone">
            {e.buyerId?.name ?? 'Buyer'} · PIN <span className="font-mono text-ink">{e.sitePincode}</span>{e.siteArea ? ` · ${e.siteArea}` : ''} · {shortDate.format(new Date(e.createdAt))}
          </p>
          <p className="whitespace-pre-line rounded-xl bg-sand-2 px-4 py-3 text-[15px]">{e.details}</p>
          {e.quote && (
            <p className="text-[14px]">
              Your quote: <span className="font-semibold tabular-nums">{rupees.format(e.quote.amount)}</span>
              {e.quote.deliveryDate && <> · ready by {formatDeliveryDate(e.quote.deliveryDate)}</>}
            </p>
          )}
          {open && (
            <div className="flex flex-wrap gap-2">
              <a href={`tel:${e.phone}`} className="btn-ghost h-10 px-3 text-[14px]">
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">call</span>
                {e.phone}
              </a>
              <a href={`https://wa.me/${waNumber(e.phone)}?text=${encodeURIComponent(`Hello from Sthiva about "${e.designTitle}": `)}`} target="_blank" rel="noreferrer" className="btn-ghost h-10 px-3 text-[14px]">
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">chat</span>
                WhatsApp
              </a>
            </div>
          )}
        </div>
      </div>

      {open && (
        <div className="flex flex-col gap-3 border-t border-sand-4 bg-sand px-5 py-4">
          {error && <p role="alert" className="text-[14px] text-error">{error}</p>}
          {quoting ? (
            <div className="flex flex-col gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5 text-[14px] font-semibold">
                  Total price (₹)
                  <input type="number" inputMode="decimal" min="1" value={amount} onChange={(ev) => setAmount(ev.target.value)} className="field font-mono" />
                </label>
                <label className="flex flex-col gap-1.5 text-[14px] font-semibold">
                  Note (optional)
                  <input value={note} onChange={(ev) => setNote(ev.target.value)} maxLength={300} placeholder="Includes loft, fitting and transport" className="field" />
                </label>
              </div>
              <p className="text-[14px] font-semibold">Ready by</p>
              <DeliveryDatePicker value={date} onChange={setDate} expected={{ minDays: 7, maxDays: 42 }} />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy || !(Number(amount) > 0)}
                  onClick={() => send({ status: 'QUOTED', quote: { amount: Number(amount), deliveryDate: date, note: note.trim() || undefined } })}
                  className="btn-lime disabled:opacity-50"
                >
                  Send quote
                </button>
                <button type="button" onClick={() => setQuoting(false)} className="btn-ghost">Back</button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={busy} onClick={() => setQuoting(true)} className="btn-lime">{e.quote ? 'Send a new quote' : 'Send quote'}</button>
              {e.status === 'NEW' && <button type="button" disabled={busy} onClick={() => send({ status: 'CONTACTED' })} className="btn-ghost">I called them</button>}
              <button type="button" disabled={busy} onClick={() => send({ status: 'CLOSED', closedReason: 'Closed by supplier' })} className="btn-ghost">Close</button>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

export default function EnquiriesPage() {
  const client = useApiClient();
  const [state, setState] = useState<{ status: 'loading' } | { status: 'error' } | { status: 'success'; enquiries: Enquiry[] }>({ status: 'loading' });
  const load = useCallback(() => {
    fetchEnquiries(client)
      .then((enquiries) => setState({ status: 'success', enquiries }))
      .catch(() => setState({ status: 'error' }));
  }, [client]);
  useEffect(load, [load]);

  return (
    <div className="flex flex-col gap-6">
      <PageHead eyebrow="Design catalogue" title="Enquiries" />
      <p className="max-w-2xl text-[15px] text-stone">Buyers who liked one of your designs. Call them to understand the sizes, then send a price and the date you can finish it.</p>
      {state.status === 'loading' && <div className="skeleton h-[160px]" role="status" aria-label="Loading enquiries" />}
      {state.status === 'error' && <ErrorNote>Could not load enquiries. Try again.</ErrorNote>}
      {state.status === 'success' && state.enquiries.length === 0 && (
        <EmptyState icon="forum" title="No enquiries yet" body="When buyers ask for a quote on one of your designs, it shows here and on your phone." cta={{ href: '/designs', label: 'Your designs' }} />
      )}
      {state.status === 'success' && state.enquiries.length > 0 && (
        <ul className="flex flex-col gap-4">{state.enquiries.map((e) => <EnquiryCard key={e._id} e={e} onChange={load} />)}</ul>
      )}
    </div>
  );
}
