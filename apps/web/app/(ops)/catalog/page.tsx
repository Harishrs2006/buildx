'use client';

import { useEffect, useState } from 'react';
import { useApiClient } from '@sthiva/web-core';
import { Chip, ChipRow, EmptyState, ErrorNote, PageHead, Pager, Pill, UNIT } from '../../../components/ui';
import { catalogApi, errorText, populated, settingsApi, useLoad, UNITS, type OpsCatalogItem } from '../../../lib/ops';

// The Sthiva catalog: one entry per thing buyers can order, shared by every supplier who sells it.
// Suppliers add new items when they list something; the team checks them here, fixes details,
// and merges duplicates so buyers see each item once.

type Filter = 'review' | 'active' | 'off';
const FILTERS: { value: Filter; label: string }[] = [
  { value: 'review', label: 'To check' },
  { value: 'active', label: 'Live' },
  { value: 'off', label: 'Switched off' },
];
const unitName = (u: string) => UNIT[u] ?? u.toLowerCase().replace('_', ' ');

function MergePicker({ item, onDone }: { item: OpsCatalogItem; onDone: () => void }) {
  const client = useApiClient();
  const [q, setQ] = useState('');
  const [found, setFound] = useState<OpsCatalogItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (q.trim().length < 2) { setFound([]); return; }
    let live = true;
    const t = setTimeout(() => {
      catalogApi.list(client, { q: q.trim(), status: 'ACTIVE' })
        .then((r) => live && setFound(r.data.filter((i) => i._id !== item._id && i.unit === item.unit).slice(0, 6)))
        .catch(() => live && setFound([]));
    }, 300);
    return () => { live = false; clearTimeout(t); };
  }, [client, q, item._id, item.unit]);

  async function merge(into: OpsCatalogItem) {
    setBusy(true);
    setError(null);
    try { await catalogApi.merge(client, item._id, into._id); onDone(); } catch (err) { setError(errorText(err, 'Couldn’t merge.')); } finally { setBusy(false); }
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-black/[0.03] p-3">
      <p className="text-[14px]">Merge into another item (same unit). Its supplier listings move there and this one is switched off.</p>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the item to keep" className="field" aria-label="Item to merge into" autoFocus />
      {found.map((f) => (
        <div key={f._id} className="flex items-center gap-2 text-[14px]">
          <span className="flex-1">{f.name}{f.brand ? ` · ${f.brand}` : ''} <span className="text-stone">({f.listings ?? 0} listings)</span></span>
          <button type="button" disabled={busy} onClick={() => merge(f)} className="btn-lime px-3">Merge here</button>
        </div>
      ))}
      {error && <p className="text-[13px] text-error">{error}</p>}
    </div>
  );
}

function ItemCard({ item, onChanged }: { item: OpsCatalogItem; onChanged: () => void }) {
  const client = useApiClient();
  const [mode, setMode] = useState<'view' | 'edit' | 'merge'>('view');
  const [name, setName] = useState(item.name);
  const [brand, setBrand] = useState(item.brand ?? '');
  const [weight, setWeight] = useState(item.weightKgPerUnit !== undefined ? String(item.weightKgPerUnit) : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const category = populated(item.categoryId);

  async function save(body: Parameters<typeof catalogApi.update>[2]) {
    setBusy(true);
    setError(null);
    try { await catalogApi.update(client, item._id, body); setMode('view'); onChanged(); } catch (err) { setError(errorText(err, 'Couldn’t save.')); } finally { setBusy(false); }
  }

  return (
    <li className="card flex flex-col gap-3 p-5">
      <div className="flex flex-wrap items-center gap-2">
        {item.needsReview && <Pill tone="wait">To check</Pill>}
        {item.status === 'INACTIVE' ? <Pill tone="muted">Off</Pill> : <Pill tone="live">Live</Pill>}
        <span className="text-[13px] text-stone">{category?.name ?? 'No category'} · per {unitName(item.unit)}</span>
        <span className="ml-auto text-[13px] text-stone">{item.liveListings ?? 0} of {item.listings ?? 0} listings live</span>
      </div>

      {mode === 'edit' ? (
        <form onSubmit={(e) => { e.preventDefault(); save({ name: name.trim(), brand: brand.trim() || null, weightKgPerUnit: weight.trim() ? Number(weight) : null }); }} className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end">
          <label className="flex flex-col gap-1 text-[13px] text-stone">Name<input value={name} onChange={(e) => setName(e.target.value)} className="field" minLength={3} maxLength={150} required /></label>
          <label className="flex flex-col gap-1 text-[13px] text-stone">Brand<input value={brand} onChange={(e) => setBrand(e.target.value)} className="field" maxLength={60} /></label>
          <label className="flex flex-col gap-1 text-[13px] text-stone">Weight per {unitName(item.unit)} (kg)<input type="number" min={0} step="0.001" value={weight} onChange={(e) => setWeight(e.target.value)} className="field" /></label>
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className="btn-lime px-4">Save</button>
            <button type="button" onClick={() => setMode('view')} className="btn-ghost">Cancel</button>
          </div>
        </form>
      ) : (
        <div>
          <p className="text-[16px] font-semibold">{item.name}</p>
          <p className="text-[14px] text-stone">
            {item.brand ? `${item.brand} · ` : ''}
            {item.weightKgPerUnit !== undefined ? `${item.weightKgPerUnit} kg per ${unitName(item.unit)}` : 'Weight not set (needed to choose a delivery vehicle)'}
            {item.createdBy?.role === 'SUPPLIER' ? ' · added by a supplier' : ''}
          </p>
        </div>
      )}

      {mode === 'merge' && <MergePicker item={item} onDone={() => { setMode('view'); onChanged(); }} />}
      {error && <p className="text-[13px] text-error">{error}</p>}

      {mode === 'view' && (
        <div className="flex flex-wrap gap-2">
          {item.needsReview && <button type="button" disabled={busy} onClick={() => save({ needsReview: false })} className="btn-lime px-4">Looks right</button>}
          <button type="button" onClick={() => setMode('edit')} className="btn-ghost">Edit</button>
          {item.status === 'ACTIVE' && <button type="button" onClick={() => setMode('merge')} className="btn-ghost">Duplicate? Merge</button>}
          <button type="button" disabled={busy} onClick={() => save({ status: item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' })} className="btn-ghost">
            {item.status === 'ACTIVE' ? 'Switch off' : 'Switch on'}
          </button>
        </div>
      )}
    </li>
  );
}

function AddItem({ onAdded }: { onAdded: () => void }) {
  const client = useApiClient();
  const { state } = useLoad(settingsApi.get, []);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: '', categoryId: '', unit: '', brand: '', weight: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return <button type="button" onClick={() => setOpen(true)} className="btn-ghost self-start">+ Add an item</button>;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await catalogApi.create(client, {
        name: f.name.trim(), categoryId: f.categoryId, unit: f.unit,
        ...(f.brand.trim() ? { brand: f.brand.trim() } : {}),
        ...(f.weight.trim() ? { weightKgPerUnit: Number(f.weight) } : {}),
      });
      setF({ name: '', categoryId: '', unit: '', brand: '', weight: '' });
      setOpen(false);
      onAdded();
    } catch (err) { setError(errorText(err, 'Couldn’t add the item.')); } finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="card grid gap-3 p-5 sm:grid-cols-3">
      <label className="flex flex-col gap-1 text-[13px] text-stone sm:col-span-3">Name<input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className="field" minLength={3} maxLength={150} required placeholder="UltraTech PPC Cement 50 kg" /></label>
      <label className="flex flex-col gap-1 text-[13px] text-stone">Category
        <select value={f.categoryId} onChange={(e) => setF({ ...f, categoryId: e.target.value })} className="field" required>
          <option value="" disabled>Choose</option>
          {state.status === 'success' && state.data.categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-[13px] text-stone">Sold per
        <select value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })} className="field" required>
          <option value="" disabled>Choose</option>
          {UNITS.map((u) => <option key={u} value={u}>{unitName(u)}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-[13px] text-stone">Brand (optional)<input value={f.brand} onChange={(e) => setF({ ...f, brand: e.target.value })} className="field" maxLength={60} /></label>
      <label className="flex flex-col gap-1 text-[13px] text-stone">Weight per unit, kg (optional)<input type="number" min={0} step="0.001" value={f.weight} onChange={(e) => setF({ ...f, weight: e.target.value })} className="field" /></label>
      <div className="flex items-end gap-2 sm:col-span-2">
        <button type="submit" disabled={busy} className="btn-lime px-5">Add item</button>
        <button type="button" onClick={() => setOpen(false)} className="btn-ghost">Cancel</button>
      </div>
      {error && <p className="text-[13px] text-error sm:col-span-3">{error}</p>}
    </form>
  );
}

export default function CatalogPage() {
  const [filter, setFilter] = useState<Filter>('review');
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const query = { q: search || undefined, page, ...(filter === 'review' ? { review: '1' } : { status: filter === 'active' ? 'ACTIVE' : 'INACTIVE' }) };
  const { state, reload } = useLoad((c) => catalogApi.list(c, query), [query]);

  return (
    <div className="flex flex-col gap-6">
      <PageHead eyebrow="Products" title="Catalog">
        <p className="max-w-sm text-[15px] text-stone">Each item appears once to buyers, whichever suppliers sell it. Check new items from suppliers and merge duplicates.</p>
      </PageHead>

      <div className="flex flex-col gap-3">
        <ChipRow label="Show">
          {FILTERS.map((f) => <Chip key={f.value} active={filter === f.value} onClick={() => { setFilter(f.value); setPage(1); }}>{f.label}</Chip>)}
        </ChipRow>
        <form onSubmit={(e) => { e.preventDefault(); setSearch(q.trim()); setPage(1); }} className="flex gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or brand" className="field flex-1" aria-label="Search items" />
          <button type="submit" className="btn-ghost">Search</button>
        </form>
        <AddItem onAdded={reload} />
      </div>

      {state.status === 'loading' && <div className="skeleton h-64" role="status" aria-label="Loading catalog" />}
      {state.status === 'error' && <ErrorNote>{errorText(state.error, 'Couldn’t load the catalog.')}</ErrorNote>}
      {state.status === 'success' && (
        state.data.data.length === 0 ? (
          <EmptyState icon="inventory_2" title={filter === 'review' ? 'Nothing to check' : 'No items here'} body={filter === 'review' ? 'New items suppliers add will appear here.' : 'Try another filter or search.'} />
        ) : (
          <>
            <ul className="flex flex-col gap-3">
              {state.data.data.map((item) => <ItemCard key={`${item._id}-${String(item.updatedAt ?? '')}`} item={item} onChanged={reload} />)}
            </ul>
            <Pager page={state.data.meta.page} totalPages={state.data.meta.totalPages} hasPrev={state.data.meta.hasPrev} hasNext={state.data.meta.hasNext} onPage={setPage} />
          </>
        )
      )}
    </div>
  );
}
