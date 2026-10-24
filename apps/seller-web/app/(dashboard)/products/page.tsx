'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useApiClient } from '@buildx/web-core';
import { useSupplierProducts, discontinueSupplierProduct, type SupplierProduct } from '../../../lib/products';

const STATUS_FILTERS = ['ACTIVE', 'DRAFT', 'OUT_OF_STOCK', 'DISCONTINUED'] as const;

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-primary-container text-on-primary-container',
  DRAFT: 'bg-surface-container-high text-on-surface-variant',
  OUT_OF_STOCK: 'bg-error-container text-on-error-container',
  INACTIVE: 'bg-surface-container-high text-on-surface-variant',
  DISCONTINUED: 'bg-surface-container-high text-on-surface-variant',
};

function ProductRow({ product, onDiscontinue }: { product: SupplierProduct; onDiscontinue: (id: string) => void }) {
  const primaryImage = product.images?.[0]?.url;
  return (
    <div className="flex items-center gap-4 rounded-xl bg-surface-container-low p-4">
      <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-surface-container-high">
        {primaryImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={primaryImage} alt="" className="h-full w-full object-cover" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-body text-sm font-semibold text-on-surface">{product.name}</p>
        <p className="font-body text-xs text-on-surface-variant">
          ₹{product.basePrice.toLocaleString('en-IN')}/{product.unit} · Stock: {product.stockQuantity}
        </p>
      </div>
      <span className={`rounded-full px-2.5 py-1 font-body text-[10px] font-bold uppercase tracking-wide ${STATUS_STYLES[product.status] ?? ''}`}>
        {product.status.replace('_', ' ')}
      </span>
      <div className="flex gap-1">
        <Link href={`/products/${product._id}/edit`} className="rounded-lg p-2 text-on-surface-variant hover:bg-surface-container-high" title="Edit">
          <span className="material-symbols-outlined text-lg">edit</span>
        </Link>
        {product.status !== 'DISCONTINUED' && (
          <button onClick={() => onDiscontinue(product._id)} className="rounded-lg p-2 text-on-surface-variant hover:bg-surface-container-high" title="Discontinue">
            <span className="material-symbols-outlined text-lg">delete</span>
          </button>
        )}
      </div>
    </div>
  );
}

export default function ProductsPage() {
  const client = useApiClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string | undefined>(undefined);
  const list = useSupplierProducts(page, status);

  async function handleDiscontinue(id: string) {
    if (!confirm('Discontinue this product? It will stop showing to buyers.')) return;
    await discontinueSupplierProduct(client, id);
    list.reload();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-headline text-2xl font-bold text-on-surface">Products</h1>
        <Link
          href="/products/new"
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-body text-sm font-bold uppercase tracking-wide text-on-primary"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          Add product
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {([undefined, ...STATUS_FILTERS] as const).map((s) => (
          <button
            key={s ?? 'ALL'}
            onClick={() => { setStatus(s); setPage(1); }}
            className={
              status === s
                ? 'rounded-full bg-primary px-3.5 py-1.5 font-body text-xs font-semibold text-on-primary'
                : 'rounded-full bg-surface-container-high px-3.5 py-1.5 font-body text-xs font-semibold text-on-surface-variant'
            }
          >
            {s ?? 'All'}
          </button>
        ))}
      </div>

      {list.status === 'loading' && <p className="font-body text-sm text-on-surface-variant">Loading…</p>}
      {list.status === 'error' && <p className="font-body text-sm text-error">Couldn't load your products.</p>}

      {list.status === 'success' && (
        <>
          {list.products.length === 0 ? (
            <p className="rounded-xl bg-surface-container-low p-6 text-center font-body text-sm text-on-surface-variant">
              No products yet. Add your first one to start selling.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {list.products.map((p) => (
                <ProductRow key={p._id} product={p} onDiscontinue={handleDiscontinue} />
              ))}
            </div>
          )}

          {list.meta.totalPages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <button disabled={!list.meta.hasPrev} onClick={() => setPage((p) => p - 1)} className="rounded-lg bg-surface-container-high px-3 py-2 disabled:opacity-40">
                <span className="material-symbols-outlined text-lg">chevron_left</span>
              </button>
              <span className="font-body text-sm text-on-surface-variant">Page {list.meta.page} of {list.meta.totalPages}</span>
              <button disabled={!list.meta.hasNext} onClick={() => setPage((p) => p + 1)} className="rounded-lg bg-surface-container-high px-3 py-2 disabled:opacity-40">
                <span className="material-symbols-outlined text-lg">chevron_right</span>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
