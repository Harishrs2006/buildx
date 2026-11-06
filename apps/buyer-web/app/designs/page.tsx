'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useApiClient, useSelectedLocation } from '@sthiva/web-core';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { DesignCard } from '@/components/designs/DesignCard';
import { DESIGN_STYLES, DESIGN_TYPES, fetchDesigns, type DesignList } from '@/lib/designs';
import { SITE } from '@/lib/site';

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`shrink-0 rounded-full px-4 py-2 text-[14px] font-medium transition-colors ${active ? 'bg-ink text-sand' : 'border border-sand-4 bg-sand-2 hover:border-ink'}`}
    >
      {children}
    </button>
  );
}

export default function DesignsPage() {
  const client = useApiClient();
  const location = useSelectedLocation();
  const [type, setType] = useState<string | null>(null);
  const [style, setStyle] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [state, setState] = useState<{ status: 'loading' } | { status: 'error' } | { status: 'success'; data: DesignList }>({ status: 'loading' });

  useEffect(() => {
    let live = true;
    setState({ status: 'loading' });
    const kinds = DESIGN_TYPES.find((t) => t.label === type)?.kinds;
    fetchDesigns(client, { kinds, style: style ?? undefined, pincode: location?.pincode, page })
      .then((data) => live && setState({ status: 'success', data }))
      .catch(() => live && setState({ status: 'error' }));
    return () => { live = false; };
  }, [client, type, style, page, location?.pincode]);

  return (
    <>
      <Header />
      <main id="main" className="pb-24">
        <section className="container-x pt-[calc(var(--header-h)+40px)]">
          <nav aria-label="Breadcrumb" className="text-[13px] text-stone">
            <Link href="/" className="hover:text-ink">Home</Link> <span aria-hidden="true">/</span> Designs
          </nav>
          <div className="mt-6 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <h1 className="max-w-3xl font-display text-[clamp(2.75rem,7vw,5.5rem)] font-bold leading-[0.92] tracking-tightest">
              Designs, <span className="font-serif font-normal italic">made to measure.</span>
            </h1>
            <p className="max-w-sm text-[15px] leading-relaxed text-stone">
              Kitchens, wardrobes, ceilings and tile looks from verified local suppliers. Pick one you like and ask for a quote for your site.
            </p>
          </div>
        </section>

        <section className="sticky top-[var(--header-h)] z-30 mt-8 border-y border-ink/[0.07] bg-sand/90 backdrop-blur-xl" aria-label="Filters">
          <div className="container-x flex flex-col gap-2 py-3">
            <div className="-mx-5 flex gap-2 overflow-x-auto px-5 sm:mx-0 sm:px-0" role="group" aria-label="Type">
              <Chip active={type === null} onClick={() => { setType(null); setPage(1); }}>All designs</Chip>
              {DESIGN_TYPES.map((t) => (
                <Chip key={t.label} active={type === t.label} onClick={() => { setType(t.label); setPage(1); }}>{t.label}</Chip>
              ))}
            </div>
            <div className="-mx-5 flex gap-2 overflow-x-auto px-5 sm:mx-0 sm:px-0" role="group" aria-label="Style">
              <Chip active={style === null} onClick={() => { setStyle(null); setPage(1); }}>Any style</Chip>
              {DESIGN_STYLES.map((s) => (
                <Chip key={s} active={style === s} onClick={() => { setStyle(s); setPage(1); }}>{s}</Chip>
              ))}
            </div>
          </div>
        </section>

        <section className="container-x pt-8" aria-live="polite">
          {location && (
            <p className="mb-6 text-[14px] text-stone">
              Showing designs from suppliers who work in PIN <span className="font-mono text-ink">{location.pincode}</span>.
            </p>
          )}
          {state.status === 'loading' && (
            <div className="grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Loading designs">
              {Array.from({ length: 6 }, (_, i) => <div key={i} className="skeleton aspect-[4/3]" />)}
            </div>
          )}
          {state.status === 'error' && (
            <p role="alert" className="card px-6 py-10 text-center text-[15px] text-error">Could not load designs right now. Try refreshing the page.</p>
          )}
          {state.status === 'success' && state.data.designs.length === 0 && (
            <div className="card flex flex-col items-center gap-3 px-6 py-16 text-center">
              <span className="material-symbols-outlined text-4xl text-stone" aria-hidden="true">design_services</span>
              <p className="font-display text-xl font-semibold">No designs here yet</p>
              <p className="max-w-md text-[15px] text-stone">
                {location
                  ? `No supplier working in ${location.pincode} has added ${type ? type.toLowerCase() : 'designs'} yet.`
                  : 'Suppliers are adding photos of their work. Check back soon.'}{' '}
                Meanwhile, browse materials by room.
              </p>
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                <Link href="/rooms" className="btn-ink">Shop by room</Link>
                {SITE.sellerPortalUrl && <a href={SITE.sellerPortalUrl} className="btn-ghost">Make interiors? Add your designs</a>}
              </div>
            </div>
          )}
          {state.status === 'success' && state.data.designs.length > 0 && (
            <>
              <ul className="grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
                {state.data.designs.map((d) => (
                  <li key={d._id}><DesignCard design={d} /></li>
                ))}
              </ul>
              {state.data.pagination.pages > 1 && (
                <nav className="mt-12 flex items-center justify-center gap-3" aria-label="Pages">
                  <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="btn-ghost h-11 px-4">Previous</button>
                  <span className="font-mono text-[13px] text-stone">Page {page} of {state.data.pagination.pages}</span>
                  <button disabled={page >= state.data.pagination.pages} onClick={() => setPage((p) => p + 1)} className="btn-ghost h-11 px-4">Next</button>
                </nav>
              )}
            </>
          )}
        </section>
      </main>
      <SiteFooter />
      <BottomNav />
    </>
  );
}
