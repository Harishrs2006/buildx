'use client';

import { LocationSelector, useProductsForLocation } from '@buildx/web-core';
import { ProductCard } from '@/components/ProductCard';

export default function HomePage() {
  const products = useProductsForLocation();

  return (
    <main className="container py-8 flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-brand-600">BuildX</h1>
        <p className="text-muted-foreground text-sm">Construction materials from verified suppliers.</p>
      </header>

      <LocationSelector />

      <section>
        <h2 className="text-lg font-semibold mb-4">
          {products.pincode ? `Products deliverable to ${products.pincode}` : 'All products'}
        </h2>

        {products.status === 'loading' && (
          <p className="text-muted-foreground text-sm">Loading products…</p>
        )}

        {products.status === 'error' && (
          <p className="text-destructive text-sm">
            Couldn't load products right now. Try refreshing the page.
          </p>
        )}

        {products.status === 'success' && products.data.products.length === 0 && (
          <p className="text-muted-foreground text-sm">
            {products.pincode
              ? 'No suppliers currently deliver to this PIN code.'
              : 'No products listed yet.'}
          </p>
        )}

        {products.status === 'success' && products.data.products.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {products.data.products.map((p) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
