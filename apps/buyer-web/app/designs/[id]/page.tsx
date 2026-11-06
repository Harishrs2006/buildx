'use client';

import { use, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ApiClientError, catalogItem, deliveryTimeLabel, useApiClient, useSelectedLocation } from '@sthiva/web-core';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { useAuth } from '@/components/auth/AuthProvider';
import { PRICE_UNIT_LABEL, fetchDesign, requestDesignQuote, type Design } from '@/lib/designs';
import { rupeesWhole } from '@/lib/format';

function QuoteForm({ design }: { design: Design }) {
  const client = useApiClient();
  const { status, user } = useAuth();
  const pathname = usePathname();
  const location = useSelectedLocation();
  const [pincode, setPincode] = useState(location?.pincode ?? '');
  const [phone, setPhone] = useState((user?.phone ?? '').replace(/^\+91/, ''));
  const [area, setArea] = useState('');
  const [details, setDetails] = useState('');
  const [state, setState] = useState<{ status: 'idle' | 'sending' | 'sent' } | { status: 'error'; message: string }>({ status: 'idle' });

  useEffect(() => { if (user?.phone && !phone) setPhone(user.phone.replace(/^\+91/, '')); }, [user, phone]);

  if (status !== 'signed-in') {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-[15px] text-sand/75">Sign in to ask {design.supplierId?.businessName ?? 'the supplier'} for a quote. It takes a minute and costs nothing.</p>
        <Link href={`/signin?next=${encodeURIComponent(pathname)}`} className="btn-lime w-full py-4">Sign in to get a quote</Link>
      </div>
    );
  }

  if (state.status === 'sent') {
    return (
      <div className="flex flex-col gap-3" role="status">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-lime text-ink">
          <span className="material-symbols-outlined text-[24px]" aria-hidden="true">check</span>
        </span>
        <p className="font-display text-xl font-semibold">Request sent</p>
        <p className="text-[15px] text-sand/75">The supplier will call you on {phone} to understand the sizes, then send a price and date. You can follow it under My quotes.</p>
        <Link href="/quotes" className="btn-lime">My quotes</Link>
      </div>
    );
  }

  const valid = /^[1-9]\d{5}$/.test(pincode) && /^[6-9]\d{9}$/.test(phone) && details.trim().length >= 10;
  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setState({ status: 'sending' });
    try {
      await requestDesignQuote(client, design._id, { sitePincode: pincode, phone, details: details.trim(), siteArea: area.trim() || undefined });
      setState({ status: 'sent' });
    } catch (err) {
      setState({ status: 'error', message: err instanceof ApiClientError ? err.message : 'Could not send. Try again.' });
    }
  }

  const field = 'w-full rounded-xl border border-white/15 bg-white/[0.06] px-4 py-3 text-[15px] text-sand placeholder:text-sand/40 focus:border-lime focus:outline-none';
  return (
    <form onSubmit={send} className="flex flex-col gap-3" noValidate>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5 text-[13px] text-sand/70">
          Site PIN code
          <input value={pincode} onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" className={`${field} font-mono`} placeholder="572103" />
        </label>
        <label className="flex flex-col gap-1.5 text-[13px] text-sand/70">
          Mobile number
          <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} inputMode="numeric" className={`${field} font-mono`} placeholder="98765 43210" />
        </label>
      </div>
      <label className="flex flex-col gap-1.5 text-[13px] text-sand/70">
        Area or locality (optional)
        <input value={area} onChange={(e) => setArea(e.target.value)} maxLength={200} className={field} placeholder="SIT Extension, Tumakuru" />
      </label>
      <label className="flex flex-col gap-1.5 text-[13px] text-sand/70">
        Sizes and what you need
        <textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={4} maxLength={1000} className={field} placeholder="Kitchen 10 x 8 ft, L-shape, loft above, white and walnut like the photo." />
      </label>
      {state.status === 'error' && <p role="alert" className="text-[14px] text-[#FFB4B6]">{state.message}</p>}
      <button type="submit" disabled={!valid || state.status === 'sending'} className="btn-lime w-full py-4 disabled:opacity-50">
        {state.status === 'sending' ? 'Sending...' : 'Ask for a quote'}
      </button>
      <p className="text-[12px] text-sand/50">Your number goes only to this supplier. No payment now.</p>
    </form>
  );
}

export default function DesignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const client = useApiClient();
  const [state, setState] = useState<{ status: 'loading' } | { status: 'missing' } | { status: 'success'; design: Design }>({ status: 'loading' });
  const [active, setActive] = useState(0);

  useEffect(() => {
    fetchDesign(client, id)
      .then((design) => setState({ status: 'success', design }))
      .catch(() => setState({ status: 'missing' }));
  }, [client, id]);

  const d = state.status === 'success' ? state.design : null;
  const kind = d ? catalogItem(d.kind) : undefined;

  return (
    <>
      <Header />
      <main id="main" className="container-x pb-24 pt-[calc(var(--header-h)+32px)]">
        <nav aria-label="Breadcrumb" className="text-[13px] text-stone">
          <Link href="/" className="hover:text-ink">Home</Link> <span aria-hidden="true">/</span>{' '}
          <Link href="/designs" className="hover:text-ink">Designs</Link>
        </nav>

        {state.status === 'loading' && <div className="skeleton mt-6 aspect-[16/9] w-full" role="status" aria-label="Loading design" />}
        {state.status === 'missing' && (
          <div className="card mt-6 flex flex-col items-center gap-3 px-6 py-16 text-center">
            <p className="font-display text-xl font-semibold">This design is not available</p>
            <p className="text-[15px] text-stone">The supplier may have removed it.</p>
            <Link href="/designs" className="btn-ink">See all designs</Link>
          </div>
        )}

        {d && (
          <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-14">
            <div className="flex flex-col gap-8">
              <div className="flex flex-col gap-3">
                <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-sand-3">
                  {d.images[active] && <Image src={d.images[active].url} alt={d.title} fill priority sizes="(min-width: 1024px) 60vw, 100vw" className="object-cover" />}
                </div>
                {d.images.length > 1 && (
                  <ul className="flex gap-2 overflow-x-auto" aria-label="Photos">
                    {d.images.map((img, i) => (
                      <li key={img.publicId} className="shrink-0">
                        <button
                          type="button"
                          onClick={() => setActive(i)}
                          aria-label={`Photo ${i + 1}`}
                          aria-current={i === active}
                          className={`relative block h-20 w-24 overflow-hidden rounded-xl ring-2 transition ${i === active ? 'ring-ink' : 'ring-transparent opacity-70 hover:opacity-100'}`}
                        >
                          <Image src={img.url} alt="" fill sizes="96px" className="object-cover" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <header>
                <p className="eyebrow text-stone">{kind?.name ?? 'Design'} · {d.style}</p>
                <h1 className="mt-2 font-display text-[clamp(2rem,4.5vw,3.25rem)] font-bold leading-[0.98] tracking-tightest">{d.title}</h1>
                {d.supplierId?.businessName && (
                  <p className="mt-3 inline-flex items-center gap-1.5 text-[15px] text-stone">
                    <span className="material-symbols-outlined text-[18px] text-tertiary" aria-hidden="true">verified</span>
                    by {d.supplierId.businessName}, a verified Sthiva supplier
                  </p>
                )}
              </header>

              {d.description && <p className="max-w-2xl whitespace-pre-line text-[17px] leading-relaxed">{d.description}</p>}

              <dl className="card divide-y divide-sand-4/70">
                {[
                  ['Starting price', `${rupeesWhole.format(d.priceFrom)} per ${PRICE_UNIT_LABEL[d.priceUnit] ?? 'unit'}`],
                  ['Usual time', `${deliveryTimeLabel(d.leadDays.min, d.leadDays.max)} after you confirm`],
                  ...(d.materials ? [['Materials', d.materials]] : []),
                  ['Style', d.style],
                ].map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] gap-4 px-5 py-3.5 text-[15px]">
                    <dt className="text-stone">{k}</dt>
                    <dd className="font-medium">{v}</dd>
                  </div>
                ))}
              </dl>

              {kind && (
                <Link href={`/materials/${kind.id}`} className="inline-flex items-center gap-2 text-[15px] font-medium underline underline-offset-4">
                  How {kind.name.toLowerCase()} is made and sold
                  <span className="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_forward</span>
                </Link>
              )}
            </div>

            <aside className="flex flex-col gap-4 lg:sticky lg:top-[calc(var(--header-h)+24px)] lg:self-start">
              <div className="on-ink rounded-3xl bg-ink p-6 text-sand">
                <p className="text-[13px] text-sand/60">Starting from</p>
                <p className="mt-1 font-display text-4xl font-bold tabular-nums">
                  {rupeesWhole.format(d.priceFrom)}<span className="text-[16px] font-medium text-sand/60"> / {PRICE_UNIT_LABEL[d.priceUnit] ?? 'unit'}</span>
                </p>
                <p className="mt-2 text-[14px] text-sand/70">The final price depends on your sizes and choices. The supplier confirms it, with a date, after talking to you.</p>
                <div className="my-5 h-px bg-white/10" />
                <QuoteForm design={d} />
              </div>
            </aside>
          </div>
        )}
      </main>
      <SiteFooter />
      <BottomNav />
    </>
  );
}
