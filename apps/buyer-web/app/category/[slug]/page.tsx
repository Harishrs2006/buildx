'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useProductsForLocation } from '@buildx/web-core';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
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
      <main className="pt-24 pb-32 px-6 max-w-7xl mx-auto">
        <section className="mb-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="max-w-2xl">
              <span className="text-primary font-bold tracking-widest text-xs uppercase mb-2 block font-body">
                Category Selection
              </span>
              <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-on-surface leading-none mb-4 font-headline">
                {category?.name ?? '…'}
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
                      ? 'px-5 py-2.5 bg-primary text-on-primary font-bold text-sm rounded-lg'
                      : 'px-5 py-2.5 bg-surface-container-high hover:bg-surface-container-highest transition-colors text-on-surface font-semibold text-sm rounded-lg'
                  }
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {products.status === 'loading' && <p className="text-on-surface-variant font-body py-12 text-center">Loading products…</p>}
        {products.status === 'error' && (
          <p className="text-error font-body py-12 text-center">Couldn't load products right now. Try refreshing the page.</p>
        )}
        {products.status === 'success' && products.data.products.length === 0 && (
          <p className="text-on-surface-variant font-body py-12 text-center">No products listed in this category yet.</p>
        )}
        {products.status === 'success' && products.data.products.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {products.data.products.map((p) => (
              <ProductListCard key={p._id} product={p} />
            ))}
          </div>
        )}

        <Link href="/" className="inline-block mt-12 text-primary font-bold font-body">
          ← Back to categories
        </Link>
      </main>
      <BottomNav />
    </>
  );
}
