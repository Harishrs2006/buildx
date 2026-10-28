'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useProductsForLocation, useSelectedLocation } from '@buildx/web-core';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { ProductListCard } from '@/components/ProductListCard';

const SUGGESTIONS = ['Cement', 'TMT bar', 'M-sand', 'Red bricks', 'Plywood', 'PVC pipe'];

function SearchResults() {
  const router = useRouter();
  const q = useSearchParams().get('q')?.trim() ?? '';
  const [input, setInput] = useState(q);
  const location = useSelectedLocation();
  const products = useProductsForLocation({ q: q || undefined, limit: 24 });

  useEffect(() => setInput(q), [q]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const v = input.trim();
    router.push(v ? `/search?q=${encodeURIComponent(v)}` : '/search');
  }

  return (
    <main id="main" className="container-x min-h-[70vh] pb-24 pt-[calc(var(--header-h)+40px)]">
      <p className="eyebrow text-stone">Search</p>
      <h1 className="mt-3 font-display text-[clamp(2.5rem,6vw,4.5rem)] font-bold leading-[0.95] tracking-tightest">
        {q ? <>Results for <span className="font-serif font-normal italic">&ldquo;{q}&rdquo;</span></> : 'Find materials'}
      </h1>

      <form onSubmit={submit} role="search" className="mt-8 flex max-w-2xl gap-2">
        <label className="relative flex-1">
          <span className="sr-only">Search materials</span>
          <span className="material-symbols-outlined pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-stone" aria-hidden="true">search</span>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            type="search"
            autoFocus={!q}
            placeholder="Cement, TMT bars, bricks, tiles..."
            className="field h-14 rounded-full pl-14 text-[16px]"
          />
        </label>
        <button type="submit" className="btn-ink h-14 px-7">Search</button>
      </form>

      {location && (
        <p className="mt-4 flex items-center gap-1.5 text-[14px] text-stone">
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">location_on</span>
          Showing products that deliver to {location.pincode}
        </p>
      )}

      {!q && (
        <div className="mt-10">
          <p className="text-[14px] font-medium text-stone">Popular searches</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => router.push(`/search?q=${encodeURIComponent(s)}`)}
                className="rounded-full border border-sand-4 bg-sand-2 px-4 py-2.5 text-[14px] font-medium transition-colors hover:border-ink hover:bg-ink hover:text-sand"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {q && (
        <div className="mt-12">
          {products.status === 'loading' && (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Searching">
              {Array.from({ length: 6 }, (_, i) => <div key={i} className="skeleton h-[420px]" />)}
            </div>
          )}
          {products.status === 'error' && (
            <p role="alert" className="card px-6 py-12 text-center text-[15px] text-error">
              Search is not responding right now. Please try again in a moment.
            </p>
          )}
          {products.status === 'success' && products.data.products.length === 0 && (
            <div className="card flex flex-col items-center gap-2 px-6 py-16 text-center">
              <span className="material-symbols-outlined text-4xl text-stone" aria-hidden="true">search_off</span>
              <p className="font-display text-xl font-semibold">Nothing matches &ldquo;{q}&rdquo;</p>
              <p className="max-w-sm text-[15px] text-stone">
                Try a simpler word, like &ldquo;cement&rdquo; or &ldquo;steel&rdquo;
                {location ? ', or a different delivery PIN.' : '.'}
              </p>
            </div>
          )}
          {products.status === 'success' && products.data.products.length > 0 && (
            <>
              <p className="mb-6 text-[14px] text-stone">
                {products.data.pagination?.total ?? products.data.products.length} products
              </p>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {products.data.products.map((p) => (
                  <ProductListCard key={p._id} product={p} />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </main>
  );
}

export default function SearchPage() {
  return (
    <>
      <Header />
      <Suspense>
        <SearchResults />
      </Suspense>
      <SiteFooter />
      <BottomNav />
    </>
  );
}
