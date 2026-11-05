'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApiClient, catalogItems, ApiClientError } from '@sthiva/web-core';
import { z } from 'zod';
import { useAuth } from '../../../components/auth/AuthProvider';
import { useCategories } from '../../../lib/categories';
import {
  BUSINESS_TYPES, addServicePincodes, describePincodeError, rejectedPincodes, removeServicePincode, setupGaps, updateSupplierProfile,
  useSupplierProfile, type BusinessType,
} from '../../../lib/setup';
import { ErrorNote } from '../../../components/ui';

const GSTIN_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const STEPS = ['Your business', 'Where you deliver', 'What you sell'] as const;

function StepTabs({ step, done, onPick }: { step: number; done: boolean[]; onPick: (i: number) => void }) {
  return (
    <ol className="grid grid-cols-3 gap-2" aria-label="Setup steps">
      {STEPS.map((label, i) => (
        <li key={label}>
          <button
            type="button"
            onClick={() => onPick(i)}
            aria-current={step === i ? 'step' : undefined}
            className={`flex w-full flex-col items-start gap-1.5 rounded-2xl border p-3 text-left transition-colors sm:flex-row sm:items-center sm:gap-3 sm:p-4 ${
              step === i ? 'border-ink bg-ink text-sand' : 'border-sand-4 bg-sand-2 hover:border-ink'
            }`}
          >
            <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full font-mono text-[13px] ${done[i] ? 'bg-lime text-ink' : step === i ? 'bg-white/10 text-sand' : 'bg-sand-3 text-ink'}`}>
              {done[i] ? <span className="material-symbols-outlined text-[18px]" aria-hidden="true">check</span> : i + 1}
            </span>
            <span className="text-[13px] font-semibold leading-tight sm:text-[15px]">{label}</span>
          </button>
        </li>
      ))}
    </ol>
  );
}

function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-full border px-4 text-[14px] font-medium transition-colors ${on ? 'border-ink bg-ink text-sand' : 'border-sand-4 bg-sand hover:border-ink'}`}
    >
      {on && <span className="material-symbols-outlined text-[18px] text-lime" aria-hidden="true">check</span>}
      {children}
    </button>
  );
}

export default function SetupPage() {
  const client = useApiClient();
  const router = useRouter();
  const profile = useSupplierProfile();
  const categories = useCategories();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // A message belongs to the step it came from
  useEffect(() => setError(null), [step]);

  // step 1
  const [businessType, setBusinessType] = useState<BusinessType | ''>('');
  const [gstin, setGstin] = useState('');
  const [address, setAddress] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [canDeliver, setCanDeliver] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);
  // step 2
  const [pinInput, setPinInput] = useState('');
  // step 3
  const [cats, setCats] = useState<string[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [customBrand, setCustomBrand] = useState('');
  const [seeded, setSeeded] = useState(false);

  const p = profile.status === 'success' ? profile.profile : null;
  useEffect(() => {
    if (!p || seeded) return;
    setBusinessType(p.businessType ?? '');
    setGstin(p.gstin ?? '');
    setAddress(p.address ?? '');
    setWhatsapp((p.whatsappNumber ?? '').replace(/^\+91/, ''));
    setCanDeliver(p.canDeliver ?? false);
    setCats(p.categories ?? []);
    setBrands(p.brands ?? []);
    setSeeded(true);
    const g = setupGaps(p);
    setStep(g.business ? 0 : g.area ? 1 : g.range ? 2 : 0);
  }, [p, seeded]);

  const gaps = setupGaps(p);
  const done = [!gaps.business, !gaps.area, !gaps.range];
  const gstinValid = gstin === '' || GSTIN_RE.test(gstin);
  const pins = [...(p?.servicePincodes ?? [])].sort();

  // brands from the catalogue for the chosen categories, most common first
  const brandGroups = useMemo(() => {
    const names = categories.status === 'success' ? new Map(categories.data.map((c) => [c.slug, c.name])) : new Map<string, string>();
    return cats.map((slug) => {
      const counts = new Map<string, number>();
      for (const item of catalogItems(slug)) for (const b of item.brands) counts.set(b, (counts.get(b) ?? 0) + 1);
      return { slug, name: names.get(slug) ?? slug, brands: [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([b]) => b) };
    });
  }, [cats, categories]);
  const catalogBrands = new Set(brandGroups.flatMap((g) => g.brands));
  const ownBrands = brands.filter((b) => !catalogBrands.has(b));

  async function run(action: () => Promise<void>) {
    setSaving(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save. Try again.');
    } finally {
      setSaving(false);
    }
  }

  const saveBusiness = () =>
    run(async () => {
      if (!businessType) throw new Error('Choose what kind of business you are.');
      if (!gstinValid) throw new Error('Check the GSTIN: it has 15 characters, like 29ABCDE1234F1Z5.');
      if (!/^[6-9]\d{9}$/.test(whatsapp)) throw new Error('Enter a 10-digit WhatsApp number.');
      profile.replace(await updateSupplierProfile(client, { businessType, gstin, address: address.trim(), whatsappNumber: whatsapp, canDeliver }));
      setStep(1);
    });

  const addPins = () =>
    run(async () => {
      const list = [...new Set(pinInput.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean))];
      if (list.length === 0) return;
      try {
        await addServicePincodes(client, list);
        setPinInput('');
      } catch (err) {
        // The API adds all or nothing: add the good ones, leave only the refused ones in the box
        const bad = rejectedPincodes(err);
        const good = list.filter((p) => !bad.some((b) => b.pincode === p));
        if (bad.length === 0 || good.length === 0) throw new Error(describePincodeError(err));
        await addServicePincodes(client, good);
        setPinInput(bad.map((b) => b.pincode).join(', '));
        profile.reload();
        throw new Error(`Added ${good.length} PIN code${good.length === 1 ? '' : 's'}. ${describePincodeError(err)}`);
      }
      profile.reload();
    });

  const removePin = (pin: string) =>
    run(async () => {
      await removeServicePincode(client, pin);
      profile.reload();
    });

  const saveRange = () =>
    run(async () => {
      if (cats.length === 0) throw new Error('Choose at least one category you sell.');
      profile.replace(await updateSupplierProfile(client, { categories: cats, brands }));
      router.push('/products/new');
    });

  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  if (profile.status === 'loading') return <div className="skeleton h-96" role="status" aria-label="Loading your profile" />;
  if (profile.status === 'error') return <ErrorNote>Couldn&apos;t load your profile. Check your connection and refresh.</ErrorNote>;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <p className="eyebrow text-stone">Business setup</p>
        <h1 className="mt-2 font-display text-[clamp(2rem,5vw,3.25rem)] font-bold leading-[0.95] tracking-tightest">
          Set up your <span className="font-serif font-normal italic">shop</span>
        </h1>
        <p className="mt-3 text-[16px] text-stone">Three short steps. Buyers only see suppliers who deliver to their site, so this decides who can order from you.</p>
      </div>

      <StepTabs step={step} done={done} onPick={setStep} />
      {error && <ErrorNote>{error}</ErrorNote>}

      {step === 0 && (
        <section className="card flex flex-col gap-6 p-5 sm:p-6" aria-label="Your business">
          <fieldset>
            <legend className="text-[15px] font-semibold">What kind of business are you?</legend>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {BUSINESS_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  aria-pressed={businessType === t.value}
                  onClick={() => setBusinessType(t.value)}
                  className={`rounded-xl border p-4 text-left transition-colors ${businessType === t.value ? 'border-ink bg-ink text-sand' : 'border-sand-4 bg-sand hover:border-ink'}`}
                >
                  <span className="block text-[15px] font-semibold">{t.label}</span>
                  <span className={`mt-1 block text-[13px] ${businessType === t.value ? 'text-sand/70' : 'text-stone'}`}>{t.hint}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <div className="flex flex-col gap-2">
            <p className="text-[15px] font-semibold">Pickup location</p>
            <p className="text-[13px] text-stone">Where goods are collected (your shop or yard). Sthiva uses it to work out delivery charges by distance. Do this while you are at the shop.</p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={locating}
                onClick={() => {
                  setLocError(null);
                  if (!('geolocation' in navigator)) { setLocError('This browser cannot share location. Try on your phone.'); return; }
                  setLocating(true);
                  navigator.geolocation.getCurrentPosition(
                    async (pos) => {
                      try {
                        profile.replace(await updateSupplierProfile(client, { location: { lat: Math.round(pos.coords.latitude * 1e6) / 1e6, lng: Math.round(pos.coords.longitude * 1e6) / 1e6 } }));
                      } catch (err) {
                        setLocError(err instanceof Error ? err.message : 'Could not save the location.');
                      } finally { setLocating(false); }
                    },
                    () => { setLocating(false); setLocError('Location permission was denied. Allow it in your browser and try again.'); },
                    { enableHighAccuracy: true, timeout: 15000 }
                  );
                }}
                className="btn-ghost"
              >
                <span className="material-symbols-outlined text-[20px]" aria-hidden="true">my_location</span>
                {locating ? 'Finding you' : p?.location ? 'Update to where I am now' : 'Use where I am now'}
              </button>
              {p?.location && (
                <a href={`https://www.google.com/maps?q=${p.location.lat},${p.location.lng}`} target="_blank" rel="noreferrer" className="text-[14px] text-cobalt hover:underline">
                  Saved: {p.location.lat.toFixed(5)}, {p.location.lng.toFixed(5)} (check on map)
                </a>
              )}
            </div>
            {locError && <p className="text-[13px] text-error">{locError}</p>}
          </div>

          <fieldset>
            <legend className="text-[15px] font-semibold">Who delivers your orders?</legend>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {[
                { v: true, label: 'We deliver ourselves', hint: 'You have your own vehicle. Sthiva charges a lower commission on these orders.' },
                { v: false, label: 'Sthiva delivers', hint: 'A Sthiva delivery partner picks up from your shop or yard.' },
              ].map((o) => (
                <button
                  key={String(o.v)}
                  type="button"
                  aria-pressed={canDeliver === o.v}
                  onClick={() => setCanDeliver(o.v)}
                  className={`rounded-xl border p-4 text-left transition-colors ${canDeliver === o.v ? 'border-ink bg-ink text-sand' : 'border-sand-4 bg-sand hover:border-ink'}`}
                >
                  <span className="block text-[15px] font-semibold">{o.label}</span>
                  <span className={`mt-1 block text-[13px] ${canDeliver === o.v ? 'text-sand/70' : 'text-stone'}`}>{o.hint}</span>
                </button>
              ))}
            </div>
            <p className="mt-2 text-[13px] text-stone">You can still choose per order when you dispatch it.</p>
          </fieldset>

          <label className="flex flex-col gap-2">
            <span className="text-[15px] font-semibold">GSTIN <span className="font-normal text-stone">(optional)</span></span>
            <input
              value={gstin}
              onChange={(e) => setGstin(e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 15))}
              placeholder="29ABCDE1234F1Z5"
              className={`field font-mono tracking-wider ${gstinValid ? '' : 'border-error'}`}
              aria-invalid={!gstinValid}
            />
            <span className={`text-[13px] ${gstinValid ? 'text-stone' : 'text-error'}`}>
              {gstinValid ? 'Lets business buyers claim GST input credit on your invoices.' : 'A GSTIN has 15 characters: state code, PAN, entity number, Z and a check character.'}
            </span>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-[15px] font-semibold">Shop or yard address</span>
            <textarea rows={2} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Shop no., street, area, town" className="field resize-none" maxLength={300} />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-[15px] font-semibold">WhatsApp for order updates</span>
            <span className="flex items-center gap-3 rounded-xl border border-sand-4 bg-sand-2 pl-4 focus-within:border-ink focus-within:shadow-[0_0_0_4px_rgba(243,184,6,0.55)]">
              <span className="border-r border-sand-4 pr-3 font-mono text-[15px]">+91</span>
              <input type="tel" inputMode="numeric" maxLength={10} value={whatsapp} onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, ''))} className="h-12 w-full bg-transparent pr-4 font-mono text-[16px] outline-none" />
            </span>
          </label>

          <button type="button" onClick={saveBusiness} disabled={saving} className="btn-ink self-end px-7">
            {saving ? 'Saving' : 'Save and continue'}
          </button>
        </section>
      )}

      {step === 1 && (
        <section className="card flex flex-col gap-5 p-5 sm:p-6" aria-label="Where you deliver">
          <div>
            <h2 className="text-[15px] font-semibold">PIN codes you deliver to</h2>
            <p className="mt-1 text-[14px] text-stone">Each PIN is checked against the India Post directory. Add several at once, separated by commas or spaces.</p>
          </div>
          <div className="flex gap-2">
            <input
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/[^0-9,\s;]/g, ''))}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPins(); } }}
              placeholder="572101, 572102, 572103"
              inputMode="numeric"
              className="field font-mono"
              aria-label="PIN codes to add"
            />
            <button type="button" onClick={addPins} disabled={saving || !pinInput.trim()} className="btn-ink shrink-0 px-5">Add</button>
          </div>
          {pins.length === 0 ? (
            <p className="rounded-xl bg-sand-3 px-4 py-4 text-[15px] text-stone">No PIN codes yet. Buyers can&apos;t see your products until you add at least one.</p>
          ) : (
            <div>
              <p className="text-[13px] text-stone">{pins.length} PIN code{pins.length === 1 ? '' : 's'}</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {pins.map((pin) => (
                  <li key={pin} className="flex items-center gap-1 rounded-full bg-ink py-1 pl-3.5 pr-1 font-mono text-[14px] text-sand">
                    {pin}
                    <button type="button" onClick={() => removePin(pin)} disabled={saving} className="grid h-8 w-8 place-items-center rounded-full text-sand/70 hover:bg-white/10 hover:text-sand" aria-label={`Remove ${pin}`}>
                      <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex justify-between gap-3">
            <button type="button" onClick={() => setStep(0)} className="btn-ghost">Back</button>
            <button type="button" onClick={() => setStep(2)} disabled={pins.length === 0} className="btn-ink px-7">Continue</button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="card flex flex-col gap-6 p-5 sm:p-6" aria-label="What you sell">
          <fieldset>
            <legend className="text-[15px] font-semibold">Categories you sell</legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {categories.status === 'success' && categories.data.map((c) => (
                <Toggle key={c._id} on={cats.includes(c.slug)} onClick={() => setCats((x) => toggle(x, c.slug))}>{c.name}</Toggle>
              ))}
              {categories.status === 'loading' && <div className="skeleton h-11 w-full" />}
            </div>
          </fieldset>

          {brandGroups.length > 0 && (
            <div className="flex flex-col gap-5">
              <div>
                <h2 className="text-[15px] font-semibold">Brands you deal in</h2>
                <p className="mt-1 text-[14px] text-stone">Your product form will offer these first. Pick none for unbranded or local material.</p>
              </div>
              {brandGroups.filter((g) => g.brands.length > 0).map((g) => (
                <fieldset key={g.slug}>
                  <legend className="eyebrow text-stone">{g.name}</legend>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {g.brands.map((b) => <Toggle key={b} on={brands.includes(b)} onClick={() => setBrands((x) => toggle(x, b))}>{b}</Toggle>)}
                  </div>
                </fieldset>
              ))}
              <div>
                <p className="eyebrow text-stone">Other or local brands</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {ownBrands.map((b) => <Toggle key={b} on onClick={() => setBrands((x) => toggle(x, b))}>{b}</Toggle>)}
                  <span className="flex gap-2">
                    <input
                      value={customBrand}
                      onChange={(e) => setCustomBrand(e.target.value.slice(0, 60))}
                      onKeyDown={(e) => { if (e.key === 'Enter' && customBrand.trim()) { e.preventDefault(); setBrands((x) => [...new Set([...x, customBrand.trim()])]); setCustomBrand(''); } }}
                      placeholder="Add a brand"
                      className="h-11 w-44 rounded-full border border-sand-4 bg-sand px-4 text-[14px] outline-none focus:border-ink"
                      aria-label="Add another brand"
                    />
                    <button type="button" disabled={!customBrand.trim()} onClick={() => { setBrands((x) => [...new Set([...x, customBrand.trim()])]); setCustomBrand(''); }} className="btn-ghost h-11 px-4">Add</button>
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between gap-3">
            <button type="button" onClick={() => setStep(1)} className="btn-ghost">Back</button>
            <button type="button" onClick={saveRange} disabled={saving || cats.length === 0} className="btn-lime px-7">
              {saving ? 'Saving' : 'Finish and list products'}
            </button>
          </div>
        </section>
      )}

      <DeleteAccount />
    </div>
  );
}

// Account deletion (the app stores require it; the privacy policy promises it). Confirmed in the page, no
// browser dialog. The API refuses while an order is open and says why.
function DeleteAccount() {
  const client = useApiClient();
  const { signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      await client.request('/users/me', { method: 'DELETE', auth: true, envelope: true, schema: z.object({ deleted: z.literal(true) }) });
      await signOut();
    } catch (err) {
      setError(err instanceof ApiClientError && err.status === 409 ? err.message : 'Could not delete your account. Please try again.');
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="self-start text-[14px] font-medium text-stone underline-offset-4 hover:text-error hover:underline">
        Delete my account
      </button>
    );
  }
  return (
    <section className="card p-5" aria-labelledby="delete-title">
      <h2 id="delete-title" className="font-display text-lg font-semibold">Delete your seller account?</h2>
      <p className="mt-2 text-[14px] leading-relaxed text-stone">
        Your details are erased, your listings are taken down and you are signed out. Past orders are kept without your
        contact details, because invoices must be kept by law.
      </p>
      {error && <p role="alert" className="mt-3 text-[14px] text-error">{error}</p>}
      <div className="mt-4 flex gap-2">
        <button type="button" onClick={confirm} disabled={busy} className="btn-ink flex-1 bg-error">
          {busy ? 'Deleting...' : 'Delete my account'}
        </button>
        <button type="button" onClick={() => setOpen(false)} disabled={busy} className="btn-ghost flex-1">Cancel</button>
      </div>
    </section>
  );
}
