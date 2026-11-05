// Pure money rules driven by admin settings. Integer paise throughout, half-up rounding.
// No amounts or percentages live here: every number comes from what an admin entered.

import { toPaise } from '../orders/pricing';

export type DeliveryArrangement = 'PLATFORM' | 'SUPPLIER';

export type CommissionConfig = { platformDeliveryPercent?: number | null; supplierDeliveryPercent?: number | null } | null | undefined;

/** The commission percent for a category and delivery arrangement, or null if an admin hasn't set it. */
export function commissionPercent(config: CommissionConfig, arrangement: DeliveryArrangement): number | null {
  const v = arrangement === 'PLATFORM' ? config?.platformDeliveryPercent : config?.supplierDeliveryPercent;
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 100 ? v : null;
}

/** Commission in paise on an amount in paise. Percent may have up to 2 decimals. */
export function commissionPaise(amountPaise: number, percent: number): number {
  const bp = BigInt(Math.round(percent * 100)); // basis points
  const n = BigInt(amountPaise) * bp;
  return Number((2n * n + 10000n) / 20000n);
}

export type VehicleRate = { code: string; name: string; maxLoadKg: number; baseFare: number; perKmRate: number; isActive?: boolean };

/** Smallest active vehicle that can carry the load in one trip; null if none can. */
export function pickVehicle<T extends VehicleRate>(loadKg: number, vehicles: T[]): T | null {
  if (!Number.isFinite(loadKg) || loadKg < 0) return null;
  const fits = vehicles
    .filter((v) => v.isActive !== false && v.maxLoadKg >= loadKg)
    .sort((a, b) => a.maxLoadKg - b.maxLoadKg || a.baseFare - b.baseFare);
  return fits[0] ?? null;
}

/** baseFare + perKmRate × km, in paise. Distance counts to 0.1 km. */
export function deliveryChargePaise(vehicle: Pick<VehicleRate, 'baseFare' | 'perKmRate'>, distanceKm: number): number {
  if (!Number.isFinite(distanceKm) || distanceKm < 0) throw new Error('Invalid distance');
  const tenthsKm = BigInt(Math.round(distanceKm * 10));
  const perKm = BigInt(toPaise(vehicle.perKmRate));
  const distancePart = (2n * perKm * tenthsKm + 10n) / 20n;
  return toPaise(vehicle.baseFare) + Number(distancePart);
}
