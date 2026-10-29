'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  useApiClient, catalogItems, catalogItem, matchCatalogItem, suggestedListingName, suggestedListingUnit, type CatalogItem,
} from '@buildx/web-core';
import { useCategories } from '../lib/categories';
import { createSupplierProduct, updateSupplierProduct, type ProductInput, type SupplierProduct } from '../lib/products';
import { ImageUploader, type ProductImage } from './ImageUploader';

const UNITS: { value: string; label: string }[] = [
  { value: 'BAG', label: 'Bag' },
  { value: 'TON', label: 'Tonne' },
  { value: 'KG', label: 'Kilogram' },
  { value: 'PIECE', label: 'Piece' },
  { value: 'BUNDLE', label: 'Bundle' },
  { value: 'CUBIC_METER', label: 'Cubic metre (m³)' },
  { value: 'SQUARE_METER', label: 'Square metre (m²)' },
  { value: 'LITER', label: 'Litre' },
  { value: 'METER', label: 'Metre' },
];

// specifications keys written by this form (the storefront shows them as the spec table)
const MATERIAL_KEY = 'Material';
const BRAND_KEY = 'Brand';

function brandOptions(catalogue: string[], mine: string[]) {
  const dealt = catalogue.filter((b) => mine.includes(b));
  return dealt.length > 0 ? dealt : catalogue;
}

function Step({ n, title, hint, children }: { n: number; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="card p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink font-mono text-[13px] text-lime">{n}</span>
        <div>
          <h2 className="font-display text-xl font-semibold tracking-tight">{title}</h2>
          {hint && <p className="mt-0.5 text-[14px] text-stone">{hint}</p>}
        </div>
      </div>
      <div className="mt-5 flex flex-col gap-5">{children}</div>
    </section>
  );
}

function Choice({ label, options, value, onChange, allowOther }: { label: string; options: string[]; value: string; onChange: (v: string) => void; allowOther?: boolean }) {
  const other = value !== '' && !options.includes(value);
  return (
    <fieldset>
      <legend className="text-[14px] font-semibold">{label}</legend>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            aria-pressed={value === o}
            onClick={() => onChange(value === o ? '' : o)}
            className={`min-h-[40px] rounded-full border px-3.5 text-[14px] font-medium transition-colors ${value === o ? 'border-ink bg-ink text-sand' : 'border-sand-4 bg-sand hover:border-ink'}`}
          >
            {o}
          </button>
        ))}
        {allowOther && (
          <input
            value={other ? value : ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Other"
            aria-label={`Other ${label.toLowerCase()}`}
            className={`h-10 w-36 rounded-full border px-4 text-[14px] outline-none transition-colors focus:border-ink ${other ? 'border-ink bg-sand-2' : 'border-sand-4 bg-sand'}`}
          />
        )}
      </div>
    </fieldset>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[14px] font-semibold">{label}</span>
      {children}
      {hint && <span className="text-[13px] text-stone">{hint}</span>}
    </label>
  );
}

function initialItem(product: SupplierProduct | undefined): CatalogItem | undefined {
  if (!product) return undefined;
  const slug = product.categoryId?.slug;
  const byMaterial = slug ? catalogItems(slug).find((i) => i.name === product.specifications?.[MATERIAL_KEY]) : undefined;
  return byMaterial ?? matchCatalogItem(product.name, slug);
}

// `brands` are the brands the supplier said they deal in (business setup). When some of them make
// this material, only those are offered, with Other for anything else.
export function ProductForm({ product, brands = [] }: { product?: SupplierProduct; brands?: string[] }) {
  const client = useApiClient();
  const router = useRouter();
  const categories = useCategories();
  const isEdit = !!product;

  const [categoryId, setCategoryId] = useState(product?.categoryId?._id ?? '');
  const [itemId, setItemId] = useState<string | null>(initialItem(product)?.id ?? null);
  const [specs, setSpecs] = useState<Record<string, string>>(product?.specifications ?? {});
  const [name, setName] = useState(product?.name ?? '');
  const [nameTouched, setNameTouched] = useState(isEdit);
  const [description, setDescription] = useState(product?.description ?? '');
  const [unit, setUnit] = useState(product?.unit ?? '');
  const [basePrice, setBasePrice] = useState(product ? String(product.basePrice) : '');
  const [stockQuantity, setStockQuantity] = useState(product ? String(product.stockQuantity) : '');
  const [minOrderQuantity, setMinOrderQuantity] = useState(product?.minOrderQuantity ? String(product.minOrderQuantity) : '1');
  const [deliveryDays, setDeliveryDays] = useState(product?.deliveryDays !== undefined ? String(product.deliveryDays) : '');
  const [images, setImages] = useState<ProductImage[]>(product?.images ?? []);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const category = categories.status === 'success' ? categories.data.find((c) => c._id === categoryId) : undefined;
  const items = useMemo(() => (category ? catalogItems(category.slug) : []), [category]);
  const item = itemId ? catalogItem(itemId) : undefined;
  const match = item && name.trim() ? matchCatalogItem(name, item.categorySlug) : undefined;

  function autoName(nextItem: CatalogItem | undefined, nextSpecs: Record<string, string>) {
    if (!nextItem || nameTouched) return;
    const choices = Object.fromEntries(nextItem.variants.map((v) => [v.label, nextSpecs[v.label] || null]));
    setName(suggestedListingName(nextItem, nextSpecs[BRAND_KEY] || null, choices));
  }

  function pickCategory(id: string) {
    if (id === categoryId) return;
    setCategoryId(id);
    setItemId(null);
    if (!isEdit) {
      setSpecs({});
      if (!nameTouched) setName('');
    }
  }

  function pickItem(next: CatalogItem) {
    setItemId(next.id);
    const nextSpecs = { [MATERIAL_KEY]: next.name };
    setSpecs(nextSpecs);
    if (!isEdit || !unit) setUnit(suggestedListingUnit(next));
    autoName(next, nextSpecs);
  }

  function setSpec(key: string, value: string) {
    const next = { ...specs };
    if (value) next[key] = value;
    else delete next[key];
    setSpecs(next);
    autoName(item, next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const cleanedSpecs = Object.fromEntries(Object.entries(specs).filter(([, v]) => v.trim() !== ''));
    const input: ProductInput = {
      name: name.trim(),
      categoryId,
      description: description.trim(),
      unit,
      basePrice: Number(basePrice),
      stockQuantity: stockQuantity === '' ? undefined : Number(stockQuantity),
      minOrderQuantity: minOrderQuantity === '' ? undefined : Number(minOrderQuantity),
      deliveryDays: deliveryDays === '' ? undefined : Number(deliveryDays),
      specifications: cleanedSpecs,
      images,
    };
    try {
      if (isEdit) await updateSupplierProduct(client, product!._id, input);
      else await createSupplierProduct(client, input);
      router.push('/products');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the product. Check the fields and try again.');
      setSubmitting(false);
    }
  }

  const unitLabel = UNITS.find((u) => u.value === unit)?.label.toLowerCase() ?? 'unit';
  const ready = categoryId && name.trim() && description.trim().length >= 10 && unit && Number(basePrice) > 0;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 pb-24">
      <Step n={1} title="What are you selling?" hint="Choose the category, then the exact material.">
        {categories.status === 'loading' && <div className="skeleton h-24" />}
        {categories.status === 'error' && <p className="text-[15px] text-error">Couldn&apos;t load categories. Refresh the page.</p>}
        {categories.status === 'success' && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5" role="radiogroup" aria-label="Category">
            {categories.data.map((c) => (
              <button
                key={c._id}
                type="button"
                role="radio"
                aria-checked={categoryId === c._id}
                onClick={() => pickCategory(c._id)}
                className={`min-h-[56px] rounded-xl border px-3 py-2.5 text-left text-[14px] font-semibold leading-tight transition-colors ${
                  categoryId === c._id ? 'border-ink bg-ink text-sand' : 'border-sand-4 bg-sand hover:border-ink'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}

        {items.length > 0 && (
          <div>
            <p className="text-[14px] font-semibold">Material</p>
            <div className="mt-2.5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3" role="radiogroup" aria-label="Material">
              {items.map((i) => (
                <button
                  key={i.id}
                  type="button"
                  role="radio"
                  aria-checked={itemId === i.id}
                  onClick={() => pickItem(i)}
                  className={`rounded-xl border px-4 py-3 text-left transition-colors ${itemId === i.id ? 'border-ink bg-ink text-sand' : 'border-sand-4 bg-sand hover:border-ink'}`}
                >
                  <span className="block text-[15px] font-semibold">{i.name}</span>
                  <span className={`mt-0.5 block text-[13px] ${itemId === i.id ? 'text-sand/70' : 'text-stone'}`}>
                    {i.group}{i.standard ? ` · ${i.standard}` : ''}
                  </span>
                </button>
              ))}
            </div>
            <p className="mt-2 text-[13px] text-stone">Not in the list? Skip this and describe the product below.</p>
          </div>
        )}
      </Step>

      {item && (item.variants.length > 0 || item.brands.length > 0) && (
        <Step n={2} title="Specification" hint="The same options buyers filter by on BuildX.">
          {item.variants.map((v) => (
            <Choice key={v.label} label={v.label} options={v.options} value={specs[v.label] ?? ''} onChange={(val) => setSpec(v.label, val)} allowOther />
          ))}
          {item.brands.length > 0 ? (
            <Choice label="Brand" options={brandOptions(item.brands, brands)} value={specs[BRAND_KEY] ?? ''} onChange={(val) => setSpec(BRAND_KEY, val)} allowOther />
          ) : (
            <Field label="Brand or make (optional)" hint="For local products, the manufacturer or kiln name.">
              <input value={specs[BRAND_KEY] ?? ''} onChange={(e) => setSpec(BRAND_KEY, e.target.value)} className="field" />
            </Field>
          )}
        </Step>
      )}

      <Step n={item ? 3 : 2} title="Listing details">
        <Field label="Product name">
          <input
            required
            value={name}
            onChange={(e) => { setName(e.target.value); setNameTouched(true); }}
            placeholder="e.g. TATA Tiscon TMT bars Fe 550D 12 mm"
            className="field"
          />
        </Field>
        {item && name.trim() && (
          match?.id === item.id ? (
            <p className="-mt-2 flex items-center gap-1.5 text-[14px] text-tertiary">
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">check_circle</span>
              Buyers will find this on the {item.name} page.
            </p>
          ) : (
            <p className="-mt-2 flex items-start gap-1.5 text-[14px] text-[#5C4300]">
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">info</span>
              Include &ldquo;{item.name.replace(/\s*\(.*\)\s*$/, '')}&rdquo; in the name so buyers find it on that material&apos;s page.
            </p>
          )
        )}
        <Field label="Description" hint="Grade, size, packing, quality certificates, what is included. At least 10 characters.">
          <textarea
            required
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={item ? item.summary : 'Describe the product for buyers'}
            className="field resize-y"
          />
        </Field>
      </Step>

      <Step n={item ? 4 : 3} title="Price and stock" hint="Prices exclude GST; buyers see GST and delivery at checkout.">
        {item && (
          <p className="flex flex-wrap items-center gap-2 text-[14px] text-stone">
            <span>Usually sold</span>
            {item.soldAs.map((s) => <span key={s.label} className="rounded-full bg-sand-3 px-2.5 py-1 text-[13px] text-ink">{s.label.replace(/^Per /, 'per ')}</span>)}
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Sold per">
            <select required value={unit} onChange={(e) => setUnit(e.target.value)} className="field">
              <option value="" disabled>Choose a unit</option>
              {UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
            </select>
          </Field>
          <Field label={`Price per ${unitLabel} (₹)`}>
            <input required type="number" inputMode="decimal" min="0" step="0.01" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} className="field font-mono" />
          </Field>
          <Field label={`Stock available (${unitLabel})`} hint="Buyers can't order more than this.">
            <input type="number" inputMode="numeric" min="0" value={stockQuantity} onChange={(e) => setStockQuantity(e.target.value)} className="field font-mono" />
          </Field>
          <Field label={`Minimum order (${unitLabel})`}>
            <input type="number" inputMode="numeric" min="1" value={minOrderQuantity} onChange={(e) => setMinOrderQuantity(e.target.value)} className="field font-mono" />
          </Field>
          <Field label="Days to deliver" hint="Shown to buyers as your quote, e.g. 2.">
            <input type="number" inputMode="numeric" min="0" max="60" value={deliveryDays} onChange={(e) => setDeliveryDays(e.target.value)} className="field font-mono" />
          </Field>
        </div>
      </Step>

      <Step n={item ? 5 : 4} title="Photos" hint="Real photos of your stock. The first one is shown in search.">
        <ImageUploader images={images} onChange={setImages} />
      </Step>

      {error && <p role="alert" className="card px-5 py-4 text-[15px] text-error">{error}</p>}

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-sand-4 bg-sand/90 backdrop-blur-xl sm:bottom-0">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+12px)] sm:px-6 max-sm:mb-[84px]">
          <Link href="/products" className="btn-ghost">Cancel</Link>
          <button type="submit" disabled={submitting || !ready} className="btn-lime px-7">
            {submitting ? (
              <>
                <span className="material-symbols-outlined animate-spin text-[20px]" aria-hidden="true">progress_activity</span>
                Saving
              </>
            ) : isEdit ? 'Save changes' : 'Publish listing'}
          </button>
        </div>
      </div>
    </form>
  );
}
