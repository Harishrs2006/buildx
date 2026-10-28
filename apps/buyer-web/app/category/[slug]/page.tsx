'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useProductsForLocation } from '@buildx/web-core';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { ProductListCard } from '@/components/ProductListCard';
import { useCategories } from '@/lib/categories';

// Only sort orders the API actually supports — no filter pill promises a feature that isn't real.
const SORTS = [
  { value: undefined, label: 'All' },
  { value: 'price_asc' as const, label: 'Price: Low to High' },
] as const;

export default function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const categories = useCategories();
  const [sort, setSort] = useState<(typeof SORTS)[number]['value']>(undefined);
  const products = useProductsForLocation({ category: slug, sort });

  const category = categories.status === 'success' ? categories.data.find((c) => c.slug === slug) : undefined;

  return (
    <>
      <Header />
      <main id="main" className="container-x pb-24 pt-[calc(var(--header-h)+40px)]">
        <section className="mb-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="max-w-2xl">
              <nav aria-label="Breadcrumb" className="mb-6 text-[13px] text-stone">
                <Link href="/" className="hover:text-ink">Home</Link> <span aria-hidden="true">/</span>{' '}
                <Link href="/#categories" className="hover:text-ink">Materials</Link>
              </nav>
              <h1 className="mb-4 font-display text-[clamp(2.75rem,7vw,5.5rem)] font-bold leading-[0.92] tracking-tightest text-ink">
                {category?.name ?? <span className="skeleton inline-block h-[0.9em] w-[6ch] align-middle" />}
              </h1>
              {category?.description && (
                <p className="text-on-surface-variant text-lg leading-relaxed max-w-lg font-body">
                  {category.description}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {SORTS.map((s) => (
                <button
                  key={s.label}
                  onClick={() => setSort(s.value)}
                  className={
                    sort === s.value
                      ? 'rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-sand'
                      : 'rounded-full border border-sand-4 bg-sand-2 px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-ink'
                  }
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {products.status === 'loading' && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Loading products">
            {Array.from({ length: 6 }, (_, i) => <div key={i} className="skeleton h-[400px]" />)}
          </div>
        )}
        {products.status === 'error' && (
          <p className="text-error font-body py-12 text-center">Couldn't load products right now. Try refreshing the page.</p>
        )}
        {products.status === 'success' && products.data.products.length === 0 && (
          <p className="text-on-surface-variant font-body py-12 text-center">No products listed in this category yet.</p>
        )}
        {products.status === 'success' && products.data.products.length > 0 && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {products.data.products.map((p) => (
              <ProductListCard key={p._id} product={p} />
            ))}
          </div>
        )}

        <Link href="/#categories" className="btn-ghost mt-12">
          <span className="material-symbols-outlined text-[20px]" aria-hidden="true">arrow_back</span>
          All materials
        </Link>
      </main>
      <SiteFooter />
      <BottomNav />
    </>
  );
}
