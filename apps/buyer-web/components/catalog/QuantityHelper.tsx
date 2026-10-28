'use client';

import { useState } from 'react';
import type { Calculator } from '@buildx/web-core';
import { units } from '@buildx/web-core';
const { bagsForKg, bulkFromBrass, bulkFromTonnes, coilsForMetres, round, tmtBarsForKg, tmtKgPerBar, tmtKgPerMetre } = units;

const fmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });

function NumberField({ label, value, onChange, suffix, step = 'any' }: { label: string; value: string; onChange: (v: string) => void; suffix: string; step?: string }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[13px] font-medium text-stone">{label}</span>
      <span className="flex items-center rounded-xl border border-sand-4 bg-sand-2 pr-4 transition-[border-color,box-shadow] focus-within:border-ink focus-within:shadow-[0_0_0_4px_rgba(200,255,61,0.55)]">
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step={step}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full min-w-0 bg-transparent px-4 py-3 font-mono text-[16px] text-ink outline-none"
        />
        <span className="shrink-0 text-[14px] text-stone">{suffix}</span>
      </span>
    </label>
  );
}

function Result({ items }: { items: { label: string; value: string }[] }) {
  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-white/10 sm:grid-cols-4">
      {items.map((i) => (
        <div key={i.label} className="bg-ink-2 px-4 py-3">
          <dt className="eyebrow text-stone-light">{i.label}</dt>
          <dd className="mt-1.5 font-display text-xl font-semibold tabular-nums text-sand">{i.value}</dd>
        </div>
      ))}
    </dl>
  );
}

const num = (v: string) => {
  const n = parseFloat(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

function BulkHelper({ density, material }: { density: number; material: string }) {
  const [mode, setMode] = useState<'tonnes' | 'brass'>('tonnes');
  const [value, setValue] = useState('10');
  const r = mode === 'tonnes' ? bulkFromTonnes(num(value), density) : bulkFromBrass(num(value), density);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2" role="radiogroup" aria-label="Enter quantity in">
        {(['tonnes', 'brass'] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={mode === m}
            onClick={() => setMode(m)}
            className={`h-10 rounded-full px-4 text-[14px] font-medium transition-colors ${mode === m ? 'bg-lime text-ink' : 'bg-white/10 text-sand hover:bg-white/15'}`}
          >
            I know the {m}
          </button>
        ))}
      </div>
      <NumberField label={mode === 'tonnes' ? 'Quantity in tonnes' : 'Quantity in brass'} value={value} onChange={setValue} suffix={mode === 'tonnes' ? 't' : 'brass'} />
      <Result
        items={[
          { label: 'Tonnes', value: `≈ ${fmt.format(round(r.tonnes, 1))}` },
          { label: 'Cubic metres', value: fmt.format(round(r.m3, 2)) },
          { label: 'Cubic feet', value: fmt.format(Math.round(r.cft)) },
          { label: 'Brass', value: fmt.format(round(r.brass, 2)) },
        ]}
      />
      <p className="text-[13px] leading-relaxed text-stone-light">
        1 brass = 100 cft = 2.83 m³ exactly. Weight assumes {material} at about {density} t/m³; moisture and grading change it, so
        confirm the supplier&apos;s unit and how they measure (weighbridge or truck volume).
      </p>
    </div>
  );
}

const TMT_SIZES = [8, 10, 12, 16, 20, 25, 32];
function TmtHelper() {
  const [dia, setDia] = useState(12);
  const [kg, setKg] = useState('1000');
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Bar diameter">
        {TMT_SIZES.map((d) => (
          <button
            key={d}
            type="button"
            role="radio"
            aria-checked={dia === d}
            onClick={() => setDia(d)}
            className={`h-10 min-w-[56px] rounded-full px-3 font-mono text-[14px] transition-colors ${dia === d ? 'bg-lime text-ink' : 'bg-white/10 text-sand hover:bg-white/15'}`}
          >
            {d} mm
          </button>
        ))}
      </div>
      <NumberField label="Steel needed" value={kg} onChange={setKg} suffix="kg" />
      <Result
        items={[
          { label: 'kg per metre', value: fmt.format(round(tmtKgPerMetre(dia), 3)) },
          { label: 'kg per 12 m bar', value: fmt.format(round(tmtKgPerBar(dia), 2)) },
          { label: '12 m bars', value: `≈ ${fmt.format(Math.ceil(tmtBarsForKg(num(kg), dia)))}` },
          { label: 'Tonnes', value: fmt.format(round(num(kg) / 1000, 3)) },
        ]}
      />
      <p className="text-[13px] leading-relaxed text-stone-light">
        Theoretical weight D² ÷ 162 kg per metre (IS 1786 practice). Actual bars vary within the standard&apos;s tolerance, and
        suppliers bill on weighed weight.
      </p>
    </div>
  );
}

function BagsHelper({ kgPerBag }: { kgPerBag: number }) {
  const [bags, setBags] = useState('100');
  const n = Math.ceil(num(bags));
  return (
    <div className="flex flex-col gap-4">
      <NumberField label="Bags" value={bags} onChange={setBags} suffix="bags" step="1" />
      <Result
        items={[
          { label: 'Bags', value: fmt.format(n) },
          { label: 'Weight', value: `${fmt.format(n * kgPerBag)} kg` },
          { label: 'Tonnes', value: fmt.format(round((n * kgPerBag) / 1000, 2)) },
          { label: 'Bags per tonne', value: fmt.format(bagsForKg(1000, kgPerBag)) },
        ]}
      />
      <p className="text-[13px] leading-relaxed text-stone-light">
        Cement is sold in {kgPerBag} kg bags. Check the manufacturing week printed on the bag: fresher cement performs better.
      </p>
    </div>
  );
}

function CoilHelper({ metresPerCoil }: { metresPerCoil: number }) {
  const [metres, setMetres] = useState('300');
  return (
    <div className="flex flex-col gap-4">
      <NumberField label="Wire run needed" value={metres} onChange={setMetres} suffix="m" />
      <Result
        items={[
          { label: 'Coils', value: fmt.format(coilsForMetres(num(metres), metresPerCoil)) },
          { label: 'Per coil', value: `${metresPerCoil} m` },
          { label: 'Total wire', value: `${fmt.format(coilsForMetres(num(metres), metresPerCoil) * metresPerCoil)} m` },
          { label: 'Spare', value: `${fmt.format(coilsForMetres(num(metres), metresPerCoil) * metresPerCoil - num(metres))} m` },
        ]}
      />
      <p className="text-[13px] leading-relaxed text-stone-light">Buy each colour separately: phase, neutral and earth runs are counted on their own.</p>
    </div>
  );
}

function CountHelper({ per, perLabel }: { per: number; perLabel: string }) {
  const [count, setCount] = useState('5000');
  return (
    <div className="flex flex-col gap-4">
      <NumberField label="Number of pieces" value={count} onChange={setCount} suffix="nos" step="1" />
      <Result
        items={[
          { label: 'Pieces', value: fmt.format(Math.ceil(num(count))) },
          { label: `Per ${perLabel}`, value: fmt.format(per) },
          { label: `Lots of ${fmt.format(per)}`, value: fmt.format(round(num(count) / per, 2)) },
          { label: 'Add 5% breakage', value: fmt.format(Math.ceil(num(count) * 1.05)) },
        ]}
      />
      <p className="text-[13px] leading-relaxed text-stone-light">Bricks are priced per 1,000. Many builders order a few percent extra for breakage in transport and cutting.</p>
    </div>
  );
}

export function QuantityHelper({ calculator }: { calculator: Calculator }) {
  return (
    <section className="rounded-3xl bg-ink p-5 text-sand sm:p-7">
      <p className="eyebrow text-lime">Quantity helper</p>
      <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight">How much to order</h2>
      <div className="mt-5">
        {calculator.kind === 'bulk' && <BulkHelper density={calculator.densityTPerM3} material={calculator.material} />}
        {calculator.kind === 'tmt' && <TmtHelper />}
        {calculator.kind === 'bags' && <BagsHelper kgPerBag={calculator.kgPerBag} />}
        {calculator.kind === 'coil' && <CoilHelper metresPerCoil={calculator.metresPerCoil} />}
        {calculator.kind === 'count' && <CountHelper per={calculator.per} perLabel={calculator.perLabel} />}
      </div>
    </section>
  );
}
