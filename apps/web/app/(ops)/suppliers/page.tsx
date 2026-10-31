'use client';

import { useState } from 'react';
import { useApiClient, catalogCategory } from '@buildx/web-core';
import { Chip, ChipRow, EmptyState, ErrorNote, PageHead, Pill, type Tone } from '../../../components/ui';
import { ago, errorText, opsApi, populated, useLoad, type OpsSupplier, type Verification } from '../../../lib/ops';

const FILTERS: { value: Verification | undefined; label: string }[] = [
  { value: 'PENDING', label: 'Waiting' },
  { value: 'VERIFIED', label: 'Verified' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: undefined, label: 'All' },
];

const BADGE: Record<Verification, { label: string; tone: Tone }> = {
  PENDING: { label: 'Waiting', tone: 'wait' },
  VERIFIED: { label: 'Verified', tone: 'live' },
  REJECTED: { label: 'Rejected', tone: 'bad' },
};

const BUSINESS_TYPE: Record<string, string> = {
  RETAILER: 'Retail shop', DEALER: 'Authorised dealer', DISTRIBUTOR: 'Distributor', MANUFACTURER: 'Manufacturer',
};

// wa.me wants the country code with no plus
const waNumber = (n: string) => {
  const d = n.replace(/\D/g, '');
  return d.length === 10 ? `91${d}` : d;
};

const GSTIN_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="eyebrow text-stone">{label}</dt>
      <dd className="mt-1 text-[15px]">{children}</dd>
    </div>
  );
}

function SupplierCard({ supplier, onChanged }: { supplier: OpsSupplier; onChanged: (s: OpsSupplier) => void }) {
  const client = useApiClient();
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const owner = populated(supplier.userId);
  const pins = supplier.servicePincodes ?? [];
  const badge = BADGE[supplier.verificationStatus];
  // What a reviewer should look at before approving
  const missing = [
    !supplier.businessType && 'business type',
    pins.length === 0 && 'delivery PIN codes',
    (supplier.categories ?? []).length === 0 && 'categories',
  ].filter(Boolean) as string[];

  async function decide(status: 'VERIFIED' | 'REJECTED') {
    setBusy(true);
    setError(null);
    try {
      const updated = await opsApi.verify(client, supplier._id, status, note.trim() || undefined);
      onChanged({ ...supplier, ...updated, userId: supplier.userId });
      setRejecting(false);
      setNote('');
    } catch (err) {
      setError(errorText(err, 'Could not save the decision.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="card overflow-hidden">
      <div className="flex flex-col gap-5 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone={badge.tone}>{badge.label}</Pill>
              {supplier.isActive === false && <Pill tone="muted">Paused</Pill>}
              {supplier.createdAt && <span className="text-[13px] text-stone">Joined {ago(supplier.createdAt)}</span>}
            </div>
            <h2 className="mt-2 font-display text-xl font-semibold tracking-tight">{supplier.businessName}</h2>
            <p className="mt-0.5 text-[14px] text-stone">
              {owner?.name ?? 'Owner'} · <span className="font-mono">{owner?.phone ?? owner?.email ?? 'no phone'}</span>
              {owner?.isActive === false && <span className="text-error"> · account suspended</span>}
            </p>
          </div>
          {supplier.whatsappNumber && (
            <a
              href={`https://wa.me/${waNumber(supplier.whatsappNumber)}`}
              target="_blank"
              rel="noreferrer"
              className="btn-ghost h-11 px-4"
            >
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">chat</span>
              WhatsApp
            </a>
          )}
        </div>

        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Fact label="Business type">{supplier.businessType ? BUSINESS_TYPE[supplier.businessType] ?? supplier.businessType : <span className="text-stone">Not given</span>}</Fact>
          <Fact label="GSTIN">
            {supplier.gstin ? (
              <span className="font-mono">
                {supplier.gstin}
                {!GSTIN_RE.test(supplier.gstin) && <span className="ml-2 text-[13px] text-error">format looks wrong</span>}
              </span>
            ) : (
              <span className="text-stone">Not given</span>
            )}
          </Fact>
          <Fact label="Address">{supplier.address || <span className="text-stone">Not given</span>}</Fact>
          <Fact label={`Delivers to ${pins.length} PIN code${pins.length === 1 ? '' : 's'}`}>
            {pins.length ? <span className="font-mono text-[14px]">{pins.slice(0, 8).join(', ')}{pins.length > 8 ? ` +${pins.length - 8} more` : ''}</span> : <span className="text-stone">None yet</span>}
          </Fact>
          <Fact label="Sells">
            {(supplier.categories ?? []).length ? supplier.categories!.map((c) => catalogCategory(c)?.name ?? c).join(', ') : <span className="text-stone">Not chosen</span>}
          </Fact>
          <Fact label="Brands">{(supplier.brands ?? []).length ? supplier.brands!.join(', ') : <span className="text-stone">None or local only</span>}</Fact>
        </dl>

        {supplier.verificationStatus === 'PENDING' && missing.length > 0 && (
          <p className="rounded-xl bg-[#FFF4D6] px-4 py-3 text-[14px] text-[#5C4300]">Setup not finished: {missing.join(', ')} missing.</p>
        )}
        {supplier.gstin && (
          <p className="text-[13px] text-stone">
            Check the GSTIN on the government portal before approving: services.gst.gov.in, Search Taxpayer.
          </p>
        )}
        {error && <ErrorNote>{error}</ErrorNote>}
      </div>

      <div className="flex flex-col gap-3 border-t border-sand-4 bg-sand px-5 py-4 sm:flex-row sm:items-center sm:px-6">
        {rejecting ? (
          <>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 500))}
              placeholder="Reason, sent to the supplier (for example: GSTIN does not match the business name)"
              className="field flex-1"
              aria-label="Reason for rejecting"
              autoFocus
            />
            <div className="flex gap-2">
              <button type="button" disabled={busy} onClick={() => decide('REJECTED')} className="btn bg-error text-white hover:bg-[#A51F24]">Reject</button>
              <button type="button" disabled={busy} onClick={() => setRejecting(false)} className="btn-ghost">Back</button>
            </div>
          </>
        ) : (
          <>
            <p className="flex-1 text-[14px] text-stone">
              {supplier.verificationStatus === 'VERIFIED' ? 'Buyers can order from this supplier.' : 'Buyers cannot order from this supplier until it is verified.'}
            </p>
            <div className="flex gap-2">
              {supplier.verificationStatus !== 'VERIFIED' && (
                <button type="button" disabled={busy} onClick={() => decide('VERIFIED')} className="btn-lime px-6">
                  <span className="material-symbols-outlined text-[20px]" aria-hidden="true">verified</span>
                  Verify
                </button>
              )}
              {supplier.verificationStatus !== 'REJECTED' && (
                <button type="button" disabled={busy} onClick={() => setRejecting(true)} className="btn-ghost">
                  {supplier.verificationStatus === 'VERIFIED' ? 'Revoke' : 'Reject'}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </li>
  );
}

export default function SuppliersPage() {
  const [filter, setFilter] = useState<Verification | undefined>('PENDING');
  const [overrides, setOverrides] = useState<Record<string, OpsSupplier>>({});
  const { state } = useLoad((c) => opsApi.suppliers(c, filter), [filter]);

  return (
    <div className="flex flex-col gap-6">
      <PageHead eyebrow="Suppliers" title="Verification">
        <p className="max-w-sm text-[15px] text-stone">Check the business is real, the GSTIN matches and the PIN codes make sense, then verify.</p>
      </PageHead>

      <ChipRow label="Filter suppliers">
        {FILTERS.map((f) => (
          <Chip key={f.label} active={filter === f.value} onClick={() => { setFilter(f.value); setOverrides({}); }}>{f.label}</Chip>
        ))}
      </ChipRow>

      {state.status === 'loading' && (
        <div className="flex flex-col gap-3" role="status" aria-label="Loading suppliers">
          {[0, 1, 2].map((i) => <div key={i} className="skeleton h-56" />)}
        </div>
      )}
      {state.status === 'error' && <ErrorNote>{errorText(state.error, 'Couldn’t load suppliers.')}</ErrorNote>}
      {state.status === 'success' && (
        state.data.length === 0 ? (
          <EmptyState icon="storefront" title="Nothing here" body={filter === 'PENDING' ? 'No suppliers are waiting for verification.' : 'No suppliers with this status.'} />
        ) : (
          <ul className="flex flex-col gap-4">
            {state.data.map((s) => {
              const current = overrides[s._id] ?? s;
              return <SupplierCard key={s._id} supplier={current} onChanged={(next) => setOverrides((o) => ({ ...o, [s._id]: next }))} />;
            })}
          </ul>
        )
      )}
    </div>
  );
}
