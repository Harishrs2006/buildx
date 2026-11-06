'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { formatDeliveryDate, useApiClient } from '@sthiva/web-core';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { EmptyState, ErrorNote, PageHead } from '@/components/account/AccountUI';
import { answerQuote, fetchMyDesignRequests, type DesignRequest } from '@/lib/designs';
import { rupees, shortDate } from '@/lib/format';

const STATUS: Record<DesignRequest['status'], { label: string; tone: string }> = {
  NEW: { label: 'Sent', tone: 'bg-sand-3 text-ink' },
  CONTACTED: { label: 'Supplier in touch', tone: 'bg-cobalt-soft text-[#0F2A8A]' },
  QUOTED: { label: 'Quote ready', tone: 'bg-lime text-ink' },
  ACCEPTED: { label: 'You accepted', tone: 'bg-ink text-sand' },
  CLOSED: { label: 'Closed', tone: 'bg-sand-3 text-stone' },
};

function QuoteRow({ r, onChange }: { r: DesignRequest; onChange: () => void }) {
  const client = useApiClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const s = STATUS[r.status];

  async function answer(status: 'ACCEPTED' | 'CLOSED') {
    setBusy(true);
    setError(null);
    try {
      await answerQuote(client, r._id, status);
      onChange();
    } catch {
      setError('Could not update. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="card flex flex-col gap-4 p-4 sm:flex-row sm:p-5">
      <Link href={`/designs/${r.designId}`} className="relative h-28 w-full shrink-0 overflow-hidden rounded-xl bg-sand-3 sm:h-24 sm:w-32">
        {r.designImage && <Image src={r.designImage} alt="" fill sizes="128px" className="object-cover" />}
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-display text-[18px] font-semibold leading-tight">{r.designTitle}</p>
          <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${s.tone}`}>{s.label}</span>
        </div>
        <p className="text-[14px] text-stone">
          {r.supplierId?.businessName ?? 'Supplier'} · PIN <span className="font-mono">{r.sitePincode}</span> · asked {shortDate.format(new Date(r.createdAt))}
        </p>
        {r.quote && (
          <div className="rounded-xl bg-sand-2 px-4 py-3 text-[15px]">
            <p>
              <span className="font-display text-xl font-bold tabular-nums">{rupees.format(r.quote.amount)}</span>
              {r.quote.deliveryDate && <span className="text-stone"> · ready by {formatDeliveryDate(r.quote.deliveryDate)}</span>}
            </p>
            {r.quote.note && <p className="mt-1 text-[14px] text-stone">{r.quote.note}</p>}
          </div>
        )}
        {error && <p role="alert" className="text-[14px] text-error">{error}</p>}
        {(r.status === 'QUOTED' || r.status === 'NEW' || r.status === 'CONTACTED') && (
          <div className="flex flex-wrap gap-2">
            {r.status === 'QUOTED' && (
              <button type="button" disabled={busy} onClick={() => answer('ACCEPTED')} className="btn-ink h-10 px-4 text-[14px]">Accept quote</button>
            )}
            <button type="button" disabled={busy} onClick={() => answer('CLOSED')} className="btn-ghost h-10 px-4 text-[14px]">
              {r.status === 'QUOTED' ? 'Not now' : 'Cancel request'}
            </button>
          </div>
        )}
        {r.status === 'ACCEPTED' && (
          <p className="text-[14px] text-stone">The supplier will confirm the work and payment with you directly.</p>
        )}
      </div>
    </li>
  );
}

function Quotes() {
  const client = useApiClient();
  const [state, setState] = useState<{ status: 'loading' } | { status: 'error' } | { status: 'success'; requests: DesignRequest[] }>({ status: 'loading' });
  const load = useCallback(() => {
    fetchMyDesignRequests(client)
      .then((requests) => setState({ status: 'success', requests }))
      .catch(() => setState({ status: 'error' }));
  }, [client]);
  useEffect(load, [load]);

  if (state.status === 'loading') return <div className="skeleton h-[140px]" role="status" aria-label="Loading quotes" />;
  if (state.status === 'error') return <ErrorNote>Could not load your quotes. Check your connection and try again.</ErrorNote>;
  if (state.requests.length === 0) {
    return (
      <EmptyState
        icon="design_services"
        title="No quotes yet"
        body="Find a kitchen, wardrobe or ceiling design you like and ask the supplier for a quote for your site."
        cta={{ href: '/designs', label: 'Browse designs' }}
      />
    );
  }
  return <ul className="flex flex-col gap-3">{state.requests.map((r) => <QuoteRow key={r._id} r={r} onChange={load} />)}</ul>;
}

export default function QuotesPage() {
  return (
    <>
      <Header />
      <main id="main" className="container-x min-h-[70vh] max-w-4xl pb-32 pt-[calc(var(--header-h)+40px)]">
        <PageHead eyebrow="Designs" title="Your" accent="quotes" />
        <div className="mt-10">
          <RequireAuth>
            <Quotes />
          </RequireAuth>
        </div>
      </main>
      <BottomNav />
    </>
  );
}
