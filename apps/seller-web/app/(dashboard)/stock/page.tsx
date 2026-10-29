'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useApiClient } from '@buildx/web-core';
import { updateSupplierProduct, useSupplierProducts, type SupplierProduct } from '../../../lib/products';
import { Chip, ChipRow, EmptyState, ErrorNote, PageHead, Pager, Pill, PRODUCT_STATUS, UNIT } from '../../../components/ui';

const FILTERS: { value: string | undefined; label: string }[] = [
  { value: undefined, label: 'All' },
  { value: 'ACTIVE', label: 'Live' },
  { value: 'OUT_OF_STOCK', label: 'Out of stock' },
  { value: 'DRAFT', label: 'Draft' },
];

// Stock is the quantity you can deliver right now, in the product's selling unit. The server
// marks a live product "Out of stock" at 0 and puts it back on sale when you restock.
function StockRow({ product, onSaved }: { product: SupplierProduct; onSaved: (p: SupplierProduct) => void }) {
  const client = useApiClient();
  const [value, setValue] = useState(String(product.stockQuantity));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => setValue(String(product.stockQuantity)), [product.stockQuantity]);

  const unit = UNIT[product.unit] ?? product.unit.toLowerCase();
  const n = value === '' ? NaN : Number(value);
  const valid = Number.isInteger(n) && n >= 0;
  const changed = valid && n !== product.stockQuantity;
  const minOrder = product.minOrderQuantity ?? 1;
  const status = PRODUCT_STATUS[product.status] ?? { label: product.status, tone: 'muted' as const };
  const locked = product.status === 'DISCONTINUED';

  async function save() {
    if (!changed) return;
    setBusy(true);
    setError(null);
    try {
      onSaved(await updateSupplierProduct(client, product._id, { stockQuantity: n }));
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save stock.');
    } finally {
      setBusy(false);
    }
  }

  const step = (d: number) => setValue(String(Math.max(0, (valid ? n : product.stockQuantity) + d)));

  return (
    <li className={`card p-4 ${product.stockQuantity === 0 && !locked ? 'border-error/40' : ''}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone={status.tone}>{status.label}</Pill>
            {product.stockQuantity > 0 && product.stockQuantity < minOrder && <Pill tone="wait">Below minimum order ({minOrder})</Pill>}
            {product.specifications?.Brand && <span className="text-[13px] text-stone">{product.specifications.Brand}</span>}
          </div>
          <Link href={`/products/${product._id}/edit`} className="mt-1.5 block truncate text-[16px] font-semibold hover:underline">{product.name}</Link>
          <p className="mt-0.5 text-[14px] text-stone">
            In stock now: <span className={`font-mono font-medium ${product.stockQuantity === 0 ? 'text-error' : 'text-ink'}`}>{product.stockQuantity.toLocaleString('en-IN')}</span> {unit}
          </p>
        </div>

        {locked ? (
          <p className="text-[14px] text-stone">Discontinued listings can&apos;t take stock.</p>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex h-12 items-center rounded-full border border-sand-4 bg-sand">
              <button type="button" onClick={() => step(-1)} disabled={busy || (valid && n === 0)} className="grid h-12 w-12 place-items-center rounded-full text-ink disabled:opacity-40" aria-label={`One ${unit} less`}>
                <span className="material-symbols-outlined text-[20px]">remove</span>
              </button>
              <input
                value={value}
                onChange={(e) => setValue(e.target.value.replace(/\D/g, '').slice(0, 7))}
                onKeyDown={(e) => { if (e.key === 'Enter') save(); }}
                inputMode="numeric"
                className="h-full w-20 bg-transparent text-center font-mono text-[16px] outline-none"
                aria-label={`Stock of ${product.name} in ${unit}`}
              />
              <button type="button" onClick={() => step(1)} disabled={busy} className="grid h-12 w-12 place-items-center rounded-full text-ink" aria-label={`One ${unit} more`}>
                <span className="material-symbols-outlined text-[20px]">add</span>
              </button>
            </div>
            <button type="button" onClick={save} disabled={!changed || busy} className="btn-ink h-12 min-w-[88px] px-5">
              {busy ? 'Saving' : saved ? 'Saved' : 'Save'}
            </button>
          </div>
        )}
      </div>
      {error && <p className="mt-3 text-[14px] text-error">{error}</p>}
    </li>
  );
}

export default function StockPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string | undefined>(undefined);
  const list = useSupplierProducts(page, status);
  const [rows, setRows] = useState<SupplierProduct[]>([]);

  // a fresh page from the server replaces local rows; saved rows are patched in place below
  const fetched = list.status === 'success' ? list.products : null;
  useEffect(() => {
    if (fetched) setRows(fetched);
  }, [fetched]);

  const out = rows.filter((p) => p.stockQuantity === 0 && p.status !== 'DISCONTINUED').length;

  return (
    <div className="flex flex-col gap-6">
      <PageHead eyebrow="Inventory" title="Stock">
        <p className="max-w-sm text-[15px] text-stone">Buyers can only order what you have in stock. Set 0 and the listing shows as out of stock until you restock.</p>
      </PageHead>

      <ChipRow label="Filter stock">
        {FILTERS.map((f) => (
          <Chip key={f.label} active={status === f.value} onClick={() => { setStatus(f.value); setPage(1); }}>{f.label}</Chip>
        ))}
      </ChipRow>

      {list.status === 'loading' && (
        <div className="flex flex-col gap-3" role="status" aria-label="Loading stock">
          {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-24" />)}
        </div>
      )}
      {list.status === 'error' && <ErrorNote>Couldn&apos;t load your stock. Check your connection and try again.</ErrorNote>}

      {list.status === 'success' && (
        <>
          {out > 0 && status !== 'OUT_OF_STOCK' && (
            <p className="flex items-center gap-2 rounded-xl bg-error-container px-4 py-3 text-[15px] text-on-error-container">
              <span className="material-symbols-outlined" aria-hidden="true">error</span>
              {out} product{out === 1 ? ' is' : 's are'} out of stock on this page.
            </p>
          )}
          {rows.length === 0 ? (
            <EmptyState
              icon="stacks"
              title={status ? 'Nothing here' : 'No products yet'}
              body={status ? 'No products with this status.' : 'List a product first, then keep its stock up to date here.'}
              cta={status ? undefined : { href: '/products/new', label: 'List a product' }}
            />
          ) : (
            <ul className="flex flex-col gap-3">
              {rows.map((p) => (
                <StockRow key={p._id} product={p} onSaved={(next) => setRows((r) => r.map((x) => (x._id === next._id ? next : x)))} />
              ))}
            </ul>
          )}
          <Pager page={list.meta.page} totalPages={list.meta.totalPages} hasPrev={list.meta.hasPrev} hasNext={list.meta.hasNext} onPage={setPage} />
        </>
      )}
    </div>
  );
}
