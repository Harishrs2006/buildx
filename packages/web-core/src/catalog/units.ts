// Trade-unit conversions used by the quantity helpers. Pure functions, unit tested.
// Volume ones are exact; weight from volume depends on the material's bulk density, which varies
// with moisture and grading, so those results are always shown as approximate.

export const CFT_PER_M3 = 35.3147;
export const CFT_PER_BRASS = 100; // 1 brass = 100 cubic feet (Indian trade unit for sand and aggregate)

export function m3ToCft(m3: number): number {
  return m3 * CFT_PER_M3;
}
export function cftToM3(cft: number): number {
  return cft / CFT_PER_M3;
}
export function brassToCft(brass: number): number {
  return brass * CFT_PER_BRASS;
}
export function cftToBrass(cft: number): number {
  return cft / CFT_PER_BRASS;
}

// Bulk material: everything derived from tonnes and an assumed bulk density (t/m³)
export function bulkFromTonnes(tonnes: number, densityTPerM3: number) {
  const m3 = tonnes / densityTPerM3;
  const cft = m3ToCft(m3);
  return { tonnes, m3, cft, brass: cftToBrass(cft) };
}
export function bulkFromBrass(brass: number, densityTPerM3: number) {
  const cft = brassToCft(brass);
  const m3 = cftToM3(cft);
  return { tonnes: m3 * densityTPerM3, m3, cft, brass };
}

// TMT / rebar: theoretical mass per metre is D²/162 kg (D in mm, steel at ~7850 kg/m³)
export const TMT_BAR_LENGTH_M = 12;
export function tmtKgPerMetre(diameterMm: number): number {
  return (diameterMm * diameterMm) / 162;
}
export function tmtKgPerBar(diameterMm: number, lengthM = TMT_BAR_LENGTH_M): number {
  return tmtKgPerMetre(diameterMm) * lengthM;
}
export function tmtBarsForKg(kg: number, diameterMm: number, lengthM = TMT_BAR_LENGTH_M): number {
  return kg / tmtKgPerBar(diameterMm, lengthM);
}

// Bagged material: bags for a weight, rounded up to whole bags
export function bagsForKg(kg: number, kgPerBag: number): number {
  return Math.ceil(kg / kgPerBag - 1e-9);
}

// Coiled wire: coils for a run length, rounded up
export function coilsForMetres(metres: number, metresPerCoil: number): number {
  return Math.ceil(metres / metresPerCoil - 1e-9);
}

export const round = (n: number, dp = 2) => Math.round(n * 10 ** dp) / 10 ** dp;
