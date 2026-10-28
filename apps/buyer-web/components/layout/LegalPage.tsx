import Link from 'next/link';
import type { ReactNode } from 'react';
import { Header } from '../Header';
import { BottomNav } from '../BottomNav';
import { SiteFooter } from './SiteFooter';
import { SITE } from '@/lib/site';

const LEGAL_LINKS = [
  { href: '/terms', label: 'Terms of service' },
  { href: '/privacy', label: 'Privacy policy' },
  { href: '/refunds', label: 'Cancellations and refunds' },
  { href: '/cookies', label: 'Cookie policy' },
];

export function LegalPage({ title, intro, path, children }: { title: string; intro: string; path: string; children: ReactNode }) {
  return (
    <>
      <Header />
      <main id="main" className="container-x pb-24 pt-[calc(var(--header-h)+40px)]">
        <nav aria-label="Breadcrumb" className="text-[13px] text-stone">
          <ol className="flex items-center gap-2">
            <li><Link href="/" className="hover:text-ink">Home</Link></li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-ink">{title}</li>
          </ol>
        </nav>

        <div className="mt-8 grid gap-12 lg:grid-cols-12">
          <aside className="lg:col-span-3">
            <ul className="sticky top-28 space-y-1">
              {LEGAL_LINKS.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    aria-current={l.href === path ? 'page' : undefined}
                    className={`block rounded-xl px-4 py-2.5 text-[14px] font-medium transition-colors ${
                      l.href === path ? 'bg-ink text-sand' : 'text-stone hover:bg-ink/5 hover:text-ink'
                    }`}
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </aside>

          <article className="lg:col-span-8">
            <h1 className="font-display text-[clamp(2.5rem,6vw,4.25rem)] font-bold leading-[0.95] tracking-tightest">{title}</h1>
            <p className="mt-4 text-[13px] text-stone">Last updated {SITE.legalUpdated}</p>
            <p className="mt-6 max-w-2xl text-[18px] leading-relaxed text-stone">{intro}</p>
            <div className="legal mt-12 max-w-2xl">{children}</div>
            <div className="mt-14 rounded-2xl border border-sand-4 bg-sand-2 p-6 text-[15px] leading-relaxed text-stone">
              <p className="font-semibold text-ink">Questions about this policy?</p>
              <p className="mt-1">
                {SITE.supportEmail ? (
                  <>
                    Write to <a className="font-medium text-cobalt underline-offset-2 hover:underline" href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a>.
                  </>
                ) : (
                  <>Contact the BuildX team through the support details shown in your account or order confirmation.</>
                )}{' '}
                {SITE.legalName}, {SITE.city}.
              </p>
            </div>
          </article>
        </div>
      </main>
      <SiteFooter />
      <BottomNav />
    </>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="font-display text-[24px] font-semibold tracking-[-0.02em] text-ink">{title}</h2>
      <div className="mt-3 space-y-3 text-[16px] leading-[1.75] text-stone [&_li]:pl-1 [&_strong]:font-semibold [&_strong]:text-ink [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
        {children}
      </div>
    </section>
  );
}
