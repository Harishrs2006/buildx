'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useApiClient } from '@buildx/web-core';
import { useSupplierProducts, discontinueSupplierProduct, type SupplierProduct } from '../../../lib/products';
import { Chip, ChipRow, EmptyState, ErrorNote, PageHead, Pager, Pill, PRODUCT_STATUS, rupees, UNIT } from '../../../components/ui';

const FILTERS: { value: string | undefined; label: string }[] = [
  { value: undefined, label: 'All' },
  { value: 'ACTIVE', label: 'Live' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'OUT_OF_STOCK', label: 'Out of stock' },
  { value: 'DISCONTINUED', label: 'Discontinued' },
];

function ProductRow({ product, onDiscontinue }: { product: SupplierProduct; onDiscontinue: (id: string) => Promise<void> }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const image = product.images?.find((i) => i.isPrimary)?.url ?? product.images?.[0]?.url;
  const status = PRODUCT_STATUS[product.status] ?? { label: product.status, tone: 'muted' as const };
  const unit = UNIT[product.unit] ?? product.unit.toLowerCase();
  const brand = product.specifications?.Brand;

  return (
    <li className="card overflow-hidden">
      <div className="flex items-center gap-4 p-4">
        <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-sand-3 sm:h-20 sm:w-20">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="material-symbols-outlined text-stone" aria-hidden="true">image</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone={status.tone}>{status.label}</Pill>
            {product.categoryId?.name && <span className="text-[13px] text-stone">{product.categoryId.name}</span>}
          </div>
          <p className="mt-1.5 truncate text-[16px] font-semibold">{product.name}</p>
          <p className="mt-0.5 flex flex-wrap gap-x-3 text-[14px] text-stone">
            <span className="font-medium text-ink">{rupees.format(product.basePrice)} / {unit}</span>
            <span className={product.stockQuantity > 0 ? '' : 'text-error'}>Stock {product.stockQuantity} {unit}</span>
            {(product.minOrderQuantity ?? 1) > 1 && <span>Min {product.minOrderQuantity}</span>}
            {brand && <span>{brand}</span>}
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          <Link href={`/products/${product._id}/edit`} className="grid h-11 w-11 place-items-center rounded-full text-stone transition-colors hover:bg-sand-3 hover:text-ink" aria-label={`Edit ${product.name}`}>
            <span className="material-symbols-outlined text-[20px]">edit</span>
          </Link>
          {product.status !== 'DISCONTINUED' && (
            <button type="button" onClick={() => setConfirming(true)} className="grid h-11 w-11 place-items-center rounded-full text-stone transition-colors hover:bg-error-container hover:text-error" aria-label={`Discontinue ${product.name}`}>
              <span className="material-symbols-outlined text-[20px]">delete</span>
            </button>
          )}
        </div>
      </div>
      {confirming && (
        <div role="alertdialog" aria-label="Discontinue this product?" className="flex flex-col gap-3 border-t border-sand-4 bg-sand px-4 py-3 sm:flex-row sm:items-center">
          <p className="flex-1 text-[15px]">Discontinue this listing? Buyers stop seeing it. Past orders are not affected.</p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={async () => { setBusy(true); await onDiscontinue(product._id); setBusy(false); setConfirming(false); }}
              className="btn bg-error text-white hover:bg-[#A51F24]"
            >
              Discontinue
            </button>
            <button type="button" disabled={busy} onClick={() => setConfirming(false)} className="btn-ghost">Keep</button>
          </div>
        </div>
      )}
    </li>
  );
}

export default function ProductsPage() {
  const client = useApiClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const list = useSupplierProducts(page, status);

  async function handleDiscontinue(id: string) {
    setError(null);
    try {
      await discontinueSupplierProduct(client, id);
      list.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not discontinue the product.');
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHead eyebrow="Catalogue" title="Your products">
        <Link href="/products/new" className="btn-lime self-start sm:self-auto">
          <span className="material-symbols-outlined text-[20px]" aria-hidden="true">add</span>
          List a product
        </Link>
      </PageHead>

      <ChipRow label="Filter products">
        {FILTERS.map((f) => (
          <Chip key={f.label} active={status === f.value} onClick={() => { setStatus(f.value); setPage(1); }}>{f.label}</Chip>
        ))}
      </ChipRow>

      {error && <ErrorNote>{error}</ErrorNote>}
      {list.status === 'loading' && (
        <div className="flex flex-col gap-3" role="status" aria-label="Loading products">
          {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-24" />)}
        </div>
      )}
      {list.status === 'error' && <ErrorNote>Couldn&apos;t load your products. Check your connection and try again.</ErrorNote>}

      {list.status === 'success' && (
        <>
          {list.products.length === 0 ? (
            <EmptyState
              icon="inventory_2"
              title={status ? 'Nothing here' : 'List your first product'}
              body={status ? 'No products with this status.' : 'Pick the material, brand and size. Buyers near you can order as soon as it is live.'}
              cta={status ? undefined : { href: '/products/new', label: 'List a product' }}
            />
          ) : (
            <ul className="flex flex-col gap-3">
              {list.products.map((p) => <ProductRow key={p._id} product={p} onDiscontinue={handleDiscontinue} />)}
            </ul>
          )}
          <Pager page={list.meta.page} totalPages={list.meta.totalPages} hasPrev={list.meta.hasPrev} hasNext={list.meta.hasNext} onPage={setPage} />
        </>
      )}
    </div>
  );
}
