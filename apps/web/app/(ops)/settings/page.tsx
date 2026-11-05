'use client';

import { useState } from 'react';
import { useApiClient } from '@sthiva/web-core';
import { EmptyState, ErrorNote, PageHead, Pill } from '../../../components/ui';
import { useAuth } from '../../../components/auth/AuthProvider';
import { errorText, settingsApi, useLoad, type CommissionRow, type Vehicle, type VehicleInput } from '../../../lib/ops';

// Platform rules an admin controls. Nothing here has a default: until an admin enters a value,
// the matching feature treats it as "not configured".

const num = (s: string): number | null => (s.trim() === '' ? null : Number(s));
const show = (n: number | null | undefined) => (n === null || n === undefined ? '' : String(n));

function Section({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <section className="card flex flex-col gap-4 p-5 sm:p-6">
      <div>
        <h2 className="text-[18px] font-semibold">{title}</h2>
        <p className="mt-1 max-w-2xl text-[14px] text-stone">{hint}</p>
      </div>
      {children}
    </section>
  );
}

function CommissionLine({ row, canEdit, onSaved }: { row: CommissionRow; canEdit: boolean; onSaved: () => void }) {
  const client = useApiClient();
  const [platform, setPlatform] = useState(show(row.platformDeliveryPercent));
  const [supplier, setSupplier] = useState(show(row.supplierDeliveryPercent));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const changed = platform !== show(row.platformDeliveryPercent) || supplier !== show(row.supplierDeliveryPercent);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await settingsApi.setCommission(client, row._id, { platformDeliveryPercent: num(platform), supplierDeliveryPercent: num(supplier) });
      onSaved();
    } catch (err) {
      setError(errorText(err, 'Couldn’t save. Use a number from 0 to 100.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <tr className="border-t border-black/10 align-top">
      <td className="py-3 pr-3 text-[15px] font-medium">
        {row.name}
        {row.isActive === false && <span className="ml-2 text-[13px] text-stone">(hidden)</span>}
        {error && <p className="mt-1 text-[13px] text-error">{error}</p>}
      </td>
      {[{ v: platform, set: setPlatform, label: 'Sthiva delivers' }, { v: supplier, set: setSupplier, label: 'Supplier delivers' }].map((f) => (
        <td key={f.label} className="py-3 pr-3">
          <div className="flex items-center gap-1">
            <input
              type="number" inputMode="decimal" min={0} max={100} step="0.01"
              value={f.v} disabled={!canEdit || busy}
              onChange={(e) => f.set(e.target.value)}
              placeholder="Not set"
              aria-label={`${row.name}: commission when ${f.label.toLowerCase()}`}
              className="field w-28"
            />
            <span className="text-stone">%</span>
          </div>
        </td>
      ))}
      <td className="py-3 text-right">
        {canEdit && changed && <button type="button" disabled={busy} onClick={save} className="btn-lime px-4">Save</button>}
      </td>
    </tr>
  );
}

const EMPTY_VEHICLE = { code: '', name: '', maxLoadKg: '', baseFare: '', perKmRate: '' };

function VehicleForm({ initial, onSubmit, onCancel, isNew }: {
  initial: typeof EMPTY_VEHICLE;
  isNew: boolean;
  onSubmit: (v: VehicleInput) => Promise<void>;
  onCancel?: () => void;
}) {
  const [f, setF] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const field = (k: keyof typeof EMPTY_VEHICLE, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="flex flex-col gap-1 text-[13px] text-stone">
      {label}
      <input value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} className="field" disabled={busy} required {...props} />
    </label>
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSubmit({
        code: f.code.trim().toUpperCase(), name: f.name.trim(),
        maxLoadKg: Number(f.maxLoadKg), baseFare: Number(f.baseFare), perKmRate: Number(f.perKmRate), isActive: true,
      });
      if (isNew) setF(EMPTY_VEHICLE);
    } catch (err) {
      setError(errorText(err, 'Couldn’t save this vehicle.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-6 sm:items-end">
      {isNew ? field('code', 'Code', { placeholder: 'MINI_TRUCK', pattern: '[A-Za-z][A-Za-z0-9_]{1,29}' }) : <div className="text-[13px] text-stone">Code<p className="font-mono text-[15px] text-ink">{f.code}</p></div>}
      {field('name', 'Name', { placeholder: 'Mini truck' })}
      {field('maxLoadKg', 'Carries up to (kg)', { type: 'number', min: 1, step: 1 })}
      {field('baseFare', 'Base fare (₹ per trip)', { type: 'number', min: 0, step: '0.01' })}
      {field('perKmRate', 'Rate (₹ per km)', { type: 'number', min: 0, step: '0.01' })}
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className="btn-lime px-4">{isNew ? 'Add' : 'Save'}</button>
        {onCancel && <button type="button" onClick={onCancel} className="btn-ghost">Cancel</button>}
      </div>
      {error && <p className="text-[13px] text-error sm:col-span-6">{error}</p>}
    </form>
  );
}

function VehicleRow({ v, canEdit, onSaved }: { v: Vehicle; canEdit: boolean; onSaved: () => void }) {
  const client = useApiClient();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  if (editing) {
    return (
      <li className="rounded-xl border border-black/10 p-4">
        <VehicleForm
          isNew={false}
          initial={{ code: v.code, name: v.name, maxLoadKg: String(v.maxLoadKg), baseFare: String(v.baseFare), perKmRate: String(v.perKmRate) }}
          onSubmit={async ({ code: _c, ...rest }) => { await settingsApi.updateVehicle(client, v._id, rest); setEditing(false); onSaved(); }}
          onCancel={() => setEditing(false)}
        />
      </li>
    );
  }

  async function toggle() {
    setBusy(true);
    try { await settingsApi.updateVehicle(client, v._id, { isActive: !v.isActive }); onSaved(); } finally { setBusy(false); }
  }

  return (
    <li className="flex flex-wrap items-center gap-3 rounded-xl border border-black/10 p-4">
      <div className="min-w-[10rem] flex-1">
        <p className="text-[16px] font-semibold">{v.name} <span className="font-mono text-[13px] text-stone">{v.code}</span></p>
        <p className="text-[14px] text-stone">Up to {v.maxLoadKg.toLocaleString('en-IN')} kg · ₹{v.baseFare} per trip + ₹{v.perKmRate} per km</p>
      </div>
      {v.isActive ? <Pill tone="live">In use</Pill> : <Pill tone="muted">Off</Pill>}
      {canEdit && (
        <div className="flex gap-2">
          <button type="button" onClick={() => setEditing(true)} className="btn-ghost">Edit</button>
          <button type="button" disabled={busy} onClick={toggle} className="btn-ghost">{v.isActive ? 'Turn off' : 'Turn on'}</button>
        </div>
      )}
    </li>
  );
}

function OfferTimeout({ value, canEdit, onSaved }: { value: number | null; canEdit: boolean; onSaved: () => void }) {
  const client = useApiClient();
  const [v, setV] = useState(show(value));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    try { await settingsApi.setGeneral(client, num(v)); onSaved(); } catch (err) { setError(errorText(err, 'Use whole minutes from 1 to 1440.')); } finally { setBusy(false); }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <input type="number" min={1} max={1440} step={1} value={v} onChange={(e) => setV(e.target.value)} disabled={!canEdit || busy}
        placeholder="Off" aria-label="Minutes a supplier has to accept an order" className="field w-28" />
      <span className="text-stone">minutes</span>
      {canEdit && v !== show(value) && <button type="button" disabled={busy} onClick={save} className="btn-lime px-4">Save</button>}
      {error && <p className="w-full text-[13px] text-error">{error}</p>}
    </div>
  );
}

export default function SettingsPage() {
  const client = useApiClient();
  const { user } = useAuth();
  const canEdit = user?.role === 'ADMIN';
  const { state, reload } = useLoad(settingsApi.get, []);

  return (
    <div className="flex flex-col gap-6">
      <PageHead eyebrow="Admin" title="Settings">
        <p className="max-w-sm text-[15px] text-stone">
          {canEdit ? 'Commission, delivery vehicles and order rules. Empty means not set yet.' : 'Only admins can change these. You can view them.'}
        </p>
      </PageHead>

      {state.status === 'loading' && <div className="skeleton h-64" role="status" aria-label="Loading settings" />}
      {state.status === 'error' && <ErrorNote>{errorText(state.error, 'Couldn’t load settings.')}</ErrorNote>}
      {state.status === 'success' && (
        <>
          <Section title="Sthiva commission" hint="Percent of the supplier’s price, per category. Set a separate rate for orders the supplier delivers themselves.">
            {state.data.categories.length === 0 ? (
              <EmptyState icon="category" title="No categories yet" body="Categories appear here once they exist in the catalog." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[13px] text-stone">
                      <th className="pb-2 pr-3 font-medium">Category</th>
                      <th className="pb-2 pr-3 font-medium">Sthiva delivers</th>
                      <th className="pb-2 pr-3 font-medium">Supplier delivers</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {state.data.categories.map((row) => (
                      <CommissionLine key={`${row._id}-${row.platformDeliveryPercent}-${row.supplierDeliveryPercent}`} row={row} canEdit={canEdit} onSaved={reload} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          <Section title="Delivery vehicles" hint="Sthiva picks the smallest vehicle in use that can carry the order. Charge = base fare + rate per km from the supplier to the site.">
            {state.data.vehicles.length === 0 && <p className="text-[14px] text-stone">No vehicles added yet.</p>}
            <ul className="flex flex-col gap-3">
              {state.data.vehicles.map((v) => <VehicleRow key={`${v._id}-${v.updatedAt ?? ''}`} v={v} canEdit={canEdit} onSaved={reload} />)}
            </ul>
            {canEdit && (
              <div className="rounded-xl bg-black/[0.03] p-4">
                <p className="mb-3 text-[14px] font-medium">Add a vehicle type</p>
                <VehicleForm isNew initial={EMPTY_VEHICLE} onSubmit={async (v) => { await settingsApi.addVehicle(client, v); reload(); }} />
              </div>
            )}
          </Section>

          <Section title="Supplier answer time" hint="How long a supplier has to accept an order before Sthiva offers it to the next supplier. Leave empty to turn it off; then the ops team moves unanswered orders by hand.">
            <OfferTimeout key={show(state.data.offerTimeoutMinutes)} value={state.data.offerTimeoutMinutes} canEdit={canEdit} onSaved={reload} />
          </Section>
        </>
      )}
    </div>
  );
}
