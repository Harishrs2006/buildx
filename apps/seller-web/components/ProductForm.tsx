'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApiClient } from '@buildx/web-core';
import { useCategories } from '../lib/categories';
import { templateForCategory } from '../lib/categoryTemplates';
import { createSupplierProduct, updateSupplierProduct, type ProductInput, type SupplierProduct } from '../lib/products';
import { ImageUploader, type ProductImage } from './ImageUploader';

const UNITS = ['KG', 'TON', 'PIECE', 'BAG', 'BUNDLE', 'CUBIC_METER', 'SQUARE_METER', 'LITER', 'METER'] as const;

function SpecPicker({
  label,
  options,
  allowCustom,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  allowCustom?: boolean;
  value: string;
  onChange: (v: string) => void;
}) {
  const isCustom = value !== '' && !options.includes(value);
  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-body text-xs font-semibold uppercase tracking-wide text-on-surface-variant">{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={
              value === opt
                ? 'rounded-full bg-primary px-3.5 py-1.5 font-body text-xs font-semibold text-on-primary'
                : 'rounded-full bg-surface-container-high px-3.5 py-1.5 font-body text-xs font-semibold text-on-surface-variant'
            }
          >
            {opt}
          </button>
        ))}
        {allowCustom && (
          <input
            value={isCustom ? value : ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Other…"
            className="w-24 rounded-full bg-surface-container-high px-3.5 py-1.5 font-body text-xs text-on-surface outline-none"
          />
        )}
      </div>
    </div>
  );
}

export function ProductForm({ product }: { product?: SupplierProduct }) {
  const client = useApiClient();
  const router = useRouter();
  const categories = useCategories();
  const isEdit = !!product;

  const [categoryId, setCategoryId] = useState(product?.categoryId?._id ?? '');
  const [name, setName] = useState(product?.name ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [unit, setUnit] = useState(product?.unit ?? '');
  const [basePrice, setBasePrice] = useState(product ? String(product.basePrice) : '');
  const [stockQuantity, setStockQuantity] = useState(product ? String(product.stockQuantity) : '');
  const [minOrderQuantity, setMinOrderQuantity] = useState(product?.minOrderQuantity ? String(product.minOrderQuantity) : '1');
  const [specs, setSpecs] = useState<Record<string, string>>(product?.specifications ?? {});
  const [images, setImages] = useState<ProductImage[]>(product?.images ?? []);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedSlug = categories.status === 'success' ? categories.data.find((c) => c._id === categoryId)?.slug : undefined;
  const template = useMemo(() => templateForCategory(selectedSlug), [selectedSlug]);

  function handleCategoryChange(id: string) {
    setCategoryId(id);
    if (!isEdit) {
      const slug = categories.status === 'success' ? categories.data.find((c) => c._id === id)?.slug : undefined;
      setUnit(templateForCategory(slug).unitHint);
      setSpecs({});
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const cleanedSpecs = Object.fromEntries(Object.entries(specs).filter(([, v]) => v.trim() !== ''));
    const input: ProductInput = {
      name,
      categoryId,
      description,
      unit,
      basePrice: Number(basePrice),
      stockQuantity: stockQuantity === '' ? undefined : Number(stockQuantity),
      minOrderQuantity: minOrderQuantity === '' ? undefined : Number(minOrderQuantity),
      specifications: cleanedSpecs,
      images,
    };
    try {
      if (isEdit) await updateSupplierProduct(client, product!._id, input);
      else await createSupplierProduct(client, input);
      router.push('/products');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the product');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <span className="font-body text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Category</span>
        <select
          required
          value={categoryId}
          onChange={(e) => handleCategoryChange(e.target.value)}
          className="rounded-lg bg-surface-container-high px-4 py-3 font-body text-sm text-on-surface outline-none"
        >
          <option value="" disabled>Choose a category…</option>
          {categories.status === 'success' &&
            categories.data.map((c) => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
        </select>
      </div>

      {template.specFields.map((field) => (
        <SpecPicker
          key={field.key}
          label={field.label}
          options={field.options}
          allowCustom={field.allowCustom}
          value={specs[field.key] ?? ''}
          onChange={(v) => setSpecs((s) => ({ ...s, [field.key]: v }))}
        />
      ))}

      <label className="flex flex-col gap-1.5">
        <span className="font-body text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Product name</span>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. TMT Bar 12mm — Fe 500"
          className="rounded-lg bg-surface-container-high px-4 py-3 font-body text-sm text-on-surface outline-none"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="font-body text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Description</span>
        <textarea
          required
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="rounded-lg bg-surface-container-high px-4 py-3 font-body text-sm text-on-surface outline-none"
        />
      </label>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <label className="flex flex-col gap-1.5">
          <span className="font-body text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Unit</span>
          <select
            required
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="rounded-lg bg-surface-container-high px-3 py-3 font-body text-sm text-on-surface outline-none"
          >
            <option value="" disabled>Unit</option>
            {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-body text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Price (₹)</span>
          <input
            required
            type="number"
            min="0"
            step="0.01"
            value={basePrice}
            onChange={(e) => setBasePrice(e.target.value)}
            className="rounded-lg bg-surface-container-high px-3 py-3 font-body text-sm text-on-surface outline-none"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-body text-xs font-semibold uppercase tracking-wide text-on-surface-variant">In stock</span>
          <input
            type="number"
            min="0"
            value={stockQuantity}
            onChange={(e) => setStockQuantity(e.target.value)}
            className="rounded-lg bg-surface-container-high px-3 py-3 font-body text-sm text-on-surface outline-none"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-body text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Min. order qty</span>
          <input
            type="number"
            min="1"
            value={minOrderQuantity}
            onChange={(e) => setMinOrderQuantity(e.target.value)}
            className="rounded-lg bg-surface-container-high px-3 py-3 font-body text-sm text-on-surface outline-none"
          />
        </label>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="font-body text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Photos</span>
        <ImageUploader images={images} onChange={setImages} />
      </div>

      {error && <p className="font-body text-sm text-error">{error}</p>}
      <button
        type="submit"
        disabled={submitting || !categoryId}
        className="rounded-lg bg-primary py-3 font-body text-sm font-bold uppercase tracking-wide text-on-primary disabled:opacity-50"
      >
        {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'List product'}
      </button>
    </form>
  );
}
