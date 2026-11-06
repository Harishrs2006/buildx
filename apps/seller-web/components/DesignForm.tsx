'use client';

import { useState } from 'react';
import { catalogItems, deliveryTimeLabel, DELIVERY_TIME_PRESETS, useApiClient } from '@sthiva/web-core';
import { ImageUploader, type ProductImage } from './ImageUploader';
import { productErrorText } from '../lib/products';
import { DESIGN_CATEGORIES, DESIGN_STYLES, PRICE_UNITS, createDesign, updateDesign, type SupplierDesign } from '../lib/designs';

// Add or edit a design: what it is, photos of your real work, starting price and usual time.
// Changing photos or words sends it back to Sthiva for a quick review.
const LONG_PRESETS = DELIVERY_TIME_PRESETS.filter((p) => p.min >= 3);

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[14px] font-semibold">{label}</span>
      {children}
      {hint && <span className="text-[13px] text-stone">{hint}</span>}
    </label>
  );
}

function Pick({ value, options, onChange, label }: { value: string; options: { value: string; label: string }[]; onChange: (v: string) => void; label: string }) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-full px-4 py-2 text-[14px] font-medium transition-colors ${value === o.value ? 'bg-ink text-sand' : 'border border-sand-4 bg-sand hover:border-ink'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function DesignForm({ start, onDone, onCancel }: { start?: SupplierDesign; onDone: () => void; onCancel: () => void }) {
  const client = useApiClient();
  const [categorySlug, setCategorySlug] = useState<string>(start?.categorySlug ?? 'modular-woodwork');
  const [kind, setKind] = useState(start?.kind ?? '');
  const [title, setTitle] = useState(start?.title ?? '');
  const [style, setStyle] = useState(start?.style ?? 'Modern');
  const [materials, setMaterials] = useState(start?.materials ?? '');
  const [description, setDescription] = useState(start?.description ?? '');
  const [images, setImages] = useState<ProductImage[]>(start?.images ?? []);
  const [price, setPrice] = useState(start ? String(start.priceFrom) : '');
  const [priceUnit, setPriceUnit] = useState(start?.priceUnit ?? 'PER_SQFT');
  const [lead, setLead] = useState(start?.leadDays ?? { min: 14, max: 21 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const kinds = catalogItems(categorySlug);
  const valid = kind && title.trim().length >= 3 && images.length > 0 && Number(price) > 0 && lead.max >= lead.min;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    setError(null);
    const body = {
      categorySlug, kind, title: title.trim(), style,
      materials: materials.trim() || undefined, description: description.trim() || undefined,
      images: images.map((i) => ({ url: i.url, publicId: i.publicId })),
      priceFrom: Number(price), priceUnit, leadDays: lead,
    };
    try {
      if (start) await updateDesign(client, start._id, body);
      else await createDesign(client, body);
      onDone();
    } catch (err) {
      setError(productErrorText(err, 'Could not save the design. Try again.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="card flex flex-col gap-6 p-5 sm:p-6" noValidate>
      <div>
        <p className="font-display text-xl font-semibold">{start ? 'Edit design' : 'Add a design'}</p>
        <p className="mt-1 text-[14px] text-stone">Photos of work you have done. Sthiva checks each design before buyers see it, usually within a day.</p>
      </div>

      <Field label="Category">
        <Pick label="Category" value={categorySlug} onChange={(v) => { setCategorySlug(v); setKind(''); }} options={DESIGN_CATEGORIES.map((c) => ({ value: c.slug, label: c.name }))} />
      </Field>
      <Field label="What is it?">
        <Pick label="Type" value={kind} onChange={setKind} options={kinds.map((k) => ({ value: k.id, label: k.name }))} />
      </Field>
      <Field label="Design name" hint="For example: L-shaped kitchen in walnut and white">
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} className="field" />
      </Field>
      <Field label="Style">
        <Pick label="Style" value={style} onChange={setStyle} options={DESIGN_STYLES.map((s) => ({ value: s, label: s }))} />
      </Field>
      <Field label="Photos" hint="Up to 8 real photos of this design. The first one is the cover.">
        <ImageUploader images={images} onChange={setImages} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Starting price (₹)" hint="Your lowest usual rate. The buyer gets the final price from you.">
          <input type="number" inputMode="decimal" min="1" value={price} onChange={(e) => setPrice(e.target.value)} className="field font-mono" />
        </Field>
        <Field label="Priced">
          <Pick label="Price unit" value={priceUnit} onChange={setPriceUnit} options={PRICE_UNITS.map((u) => ({ value: u.value, label: u.label }))} />
        </Field>
      </div>
      <Field label="Usual time after the buyer confirms" hint={`Buyers see: ${deliveryTimeLabel(lead.min, lead.max).toLowerCase()}. You confirm the exact date in your quote.`}>
        <Pick
          label="Usual time"
          value={`${lead.min}-${lead.max}`}
          onChange={(v) => { const [min, max] = v.split('-').map(Number); setLead({ min, max }); }}
          options={LONG_PRESETS.map((p) => ({ value: `${p.min}-${p.max}`, label: p.label }))}
        />
      </Field>
      <Field label="Materials (optional)" hint="For example: BWP plywood, acrylic shutters, soft-close hinges">
        <input value={materials} onChange={(e) => setMaterials(e.target.value)} maxLength={200} className="field" />
      </Field>
      <Field label="About this design (optional)">
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} rows={4} className="field" />
      </Field>

      {error && <p role="alert" className="text-[14px] text-error">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={!valid || busy} className="btn-lime disabled:opacity-50">{busy ? 'Saving...' : start ? 'Save changes' : 'Send for review'}</button>
        <button type="button" onClick={onCancel} className="btn-ghost">Cancel</button>
      </div>
    </form>
  );
}
