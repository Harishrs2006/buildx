// Delivery charge for an order, from admin settings only.
//
//   weight   = Σ quantity × catalog item weight per unit (ops enter weights in the Catalog tab)
//   vehicle  = smallest active vehicle type that carries the weight (Settings → Delivery vehicles)
//   distance = straight-line km from the supplier's pickup location to the delivery point
//              (the buyer's pinned location, else the delivery PIN's post office location)
//   charge   = vehicle base fare + per-km rate × distance
//
// Delivery pricing is OFF until an admin adds at least one vehicle type: then the charge is 0, as
// before. Once it is on, an order whose delivery can't be priced is refused with the reason, so no
// order is ever taken with a guessed charge.

import { Types } from 'mongoose';
import { VehicleType } from '../../infrastructure/database/models/VehicleType.model';
import { CatalogItem } from '../../infrastructure/database/models/CatalogItem.model';
import { PostalOffice } from '../../infrastructure/database/models/PostalOffice.model';
import { pickVehicle, deliveryChargePaise } from '../settings/rates';

export type LatLng = { lat: number; lng: number };

export type DeliveryQuote =
  | { status: 'OFF' }
  | { status: 'PRICED'; chargePaise: number; vehicleCode: string; vehicleName: string; weightKg: number; distanceKm: number }
  | { status: 'UNPRICED'; reason: 'NO_WEIGHT' | 'TOO_HEAVY' | 'NO_SUPPLIER_LOCATION' | 'NO_DELIVERY_LOCATION'; message: string };

/** Great-circle distance in km, rounded to 0.1 km. */
export function distanceKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)) * 10) / 10;
}

const validPoint = (p?: Partial<LatLng> | null): p is LatLng =>
  !!p && Number.isFinite(p.lat) && Number.isFinite(p.lng) && Math.abs(p.lat!) <= 90 && Math.abs(p.lng!) <= 180 && !(p.lat === 0 && p.lng === 0);

/** Where the goods go: the pinned point, else the delivery PIN's post office. */
export async function deliveryPoint(address: { lat?: number; lng?: number; pincode?: string }): Promise<LatLng | null> {
  if (validPoint(address)) return { lat: address.lat, lng: address.lng };
  if (!address.pincode) return null;
  const office = await PostalOffice.findOne({ pincode: address.pincode, 'location.lat': { $type: 'number' } }).select('location').lean();
  return validPoint(office?.location) ? office!.location! : null;
}

export async function activeVehicles() {
  return VehicleType.find({ isActive: true }).lean();
}

/** Total weight in kg, or null if any item has no weight yet. */
export async function orderWeightKg(lines: { catalogItemId?: Types.ObjectId | string | null; quantity: number }[]): Promise<number | null> {
  const ids = lines.map((l) => l.catalogItemId);
  if (ids.some((id) => !id)) return null;
  const items = await CatalogItem.find({ _id: { $in: ids } }).select('weightKgPerUnit').lean();
  const byId = new Map(items.map((i) => [i._id.toString(), i.weightKgPerUnit]));
  let total = 0;
  for (const l of lines) {
    const w = byId.get(String(l.catalogItemId));
    if (typeof w !== 'number' || !(w > 0)) return null;
    total += w * l.quantity;
  }
  return Math.round(total * 1000) / 1000;
}

export async function quoteDelivery(params: {
  lines: { catalogItemId?: Types.ObjectId | string | null; quantity: number }[];
  supplierLocation?: Partial<LatLng> | null;
  destination: LatLng | null;
  vehicles?: Awaited<ReturnType<typeof activeVehicles>>;
}): Promise<DeliveryQuote> {
  const vehicles = params.vehicles ?? (await activeVehicles());
  if (vehicles.length === 0) return { status: 'OFF' };
  const weightKg = await orderWeightKg(params.lines);
  if (weightKg === null) {
    return { status: 'UNPRICED', reason: 'NO_WEIGHT', message: 'Delivery for some items can’t be priced yet. Please contact Sthiva support.' };
  }
  const vehicle = pickVehicle(weightKg, vehicles);
  if (!vehicle) {
    return { status: 'UNPRICED', reason: 'TOO_HEAVY', message: `This order (${weightKg} kg) is more than one vehicle can carry. Split it, or contact Sthiva support.` };
  }
  if (!validPoint(params.supplierLocation)) {
    return { status: 'UNPRICED', reason: 'NO_SUPPLIER_LOCATION', message: 'Delivery from this supplier can’t be priced yet. Please contact Sthiva support.' };
  }
  if (!params.destination) {
    return { status: 'UNPRICED', reason: 'NO_DELIVERY_LOCATION', message: 'Pin your delivery location on the map so we can price delivery.' };
  }
  const km = distanceKm(params.supplierLocation, params.destination);
  return { status: 'PRICED', chargePaise: deliveryChargePaise(vehicle, km), vehicleCode: vehicle.code, vehicleName: vehicle.name, weightKg, distanceKm: km };
}
