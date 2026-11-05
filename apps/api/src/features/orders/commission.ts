// Buyer prices from supplier prices.
//
// Rule (2026-11-05, owner can change): the buyer pays the supplier's listed price plus Sthiva's
// commission for the category at the "Sthiva delivers" rate. The supplier's listed price is what
// the supplier earns. When the supplier delivers with their own vehicle, Sthiva keeps only the
// lower "supplier delivers" rate and the difference goes to the supplier (see payoutFor).
// A category without a configured commission is not sold: nothing is priced with a made-up rate.

import { Types } from 'mongoose';
import { Category } from '../../infrastructure/database/models/Category.model';
import { toPaise, paiseToRupees, type PricingProduct } from './pricing';
import { commissionPercent } from '../settings/rates';

export type Rates = { platform: number; supplier: number | null };

/** Commission rates per category id. Categories without a "Sthiva delivers" rate, or hidden by an admin, are absent. */
export async function ratesFor(categoryIds: (Types.ObjectId | string)[]): Promise<Map<string, Rates>> {
  const ids = [...new Set(categoryIds.map(String))];
  const cats = await Category.find({ _id: { $in: ids }, isActive: { $ne: false } }).select('commission').lean();
  const map = new Map<string, Rates>();
  for (const c of cats) {
    const platform = commissionPercent(c.commission, 'PLATFORM');
    if (platform === null) continue;
    map.set(c._id.toString(), { platform, supplier: commissionPercent(c.commission, 'SUPPLIER') });
  }
  return map;
}

/** amount × (1 + percent/100), in rupees rounded half-up to the paisa. */
export function addPercent(rupees: number, percent: number): number {
  const paise = BigInt(toPaise(rupees));
  const bp = BigInt(Math.round(percent * 100));
  const n = paise * (10000n + bp);
  return paiseToRupees(Number((2n * n + 10000n) / 20000n));
}

/** The listing as the buyer sees it: base price and bulk tiers with commission added. */
export function buyerProduct<T extends PricingProduct>(listing: T, percent: number): T {
  return {
    ...listing,
    basePrice: addPercent(listing.basePrice, percent),
    bulkPricing: (listing.bulkPricing ?? []).map((t) => ({ minQty: t.minQty, price: addPercent(t.price, percent) })),
  };
}

/**
 * What the supplier is paid for a line: their own price, plus the commission difference when they
 * deliver themselves. Amounts in paise.
 */
export function payoutFor(line: { supplierLineTotal: number; lineTotal: number; commissionPercent?: number; supplierDeliveryPercent?: number | null }, selfDelivered: boolean) {
  const supplierPaise = toPaise(line.supplierLineTotal);
  const buyerPaise = toPaise(line.lineTotal);
  let commission = buyerPaise - supplierPaise;
  if (selfDelivered && typeof line.supplierDeliveryPercent === 'number' && typeof line.commissionPercent === 'number'
      && line.supplierDeliveryPercent < line.commissionPercent) {
    // Sthiva keeps the lower rate, on the supplier's amount
    const bp = BigInt(Math.round(line.supplierDeliveryPercent * 100));
    const kept = Number((2n * BigInt(supplierPaise) * bp + 10000n) / 20000n);
    commission = Math.min(commission, kept);
  }
  return { payoutPaise: buyerPaise - commission, commissionPaise: commission };
}

type EarningLine = { lineTotal: number; supplierLineTotal?: number; commissionPercent?: number; supplierDeliveryPercent?: number };

/**
 * What a supplier earns on an order, both ways it can be delivered, in rupees. Orders from before
 * commission existed have no supplier side: the supplier earns the full line.
 */
export function supplierEarnings(order: {
  total: number; items: EarningLine[]; deliveryMode?: 'PLATFORM' | 'SUPPLIER';
  deliveryCharge?: number; delivery?: { driverSharePercent?: number } | null;
}) {
  const sum = (self: boolean) => order.items.reduce(
    (acc, it) => {
      const r = payoutFor({ ...it, supplierLineTotal: it.supplierLineTotal ?? it.lineTotal }, self);
      return { payout: acc.payout + r.payoutPaise, commission: acc.commission + r.commissionPaise };
    },
    { payout: 0, commission: 0 }
  );
  const sthiva = sum(false);
  const own = sum(true);
  // Delivery charge (user decision 2026-11-05): all of it to the supplier when they deliver;
  // with a Sthiva driver, the driver gets the admin-set share and Sthiva the rest.
  const chargePaise = toPaise(order.deliveryCharge ?? 0);
  const share = order.delivery?.driverSharePercent;
  const driverPaise = typeof share === 'number' ? Number((2n * BigInt(chargePaise) * BigInt(Math.round(share * 100)) + 10000n) / 20000n) : null;
  return {
    orderValue: order.total,
    deliveryCharge: paiseToRupees(chargePaise),
    // If a Sthiva delivery partner delivers
    payoutIfSthivaDelivers: paiseToRupees(sthiva.payout),
    commissionIfSthivaDelivers: paiseToRupees(sthiva.commission),
    driverPayout: driverPaise === null ? null : paiseToRupees(driverPaise),
    sthivaDeliveryShare: driverPaise === null ? null : paiseToRupees(chargePaise - driverPaise),
    // If the supplier delivers with their own vehicle (Sthiva keeps the lower rate; delivery charge is theirs)
    payoutIfYouDeliver: paiseToRupees(own.payout + chargePaise),
    commissionIfYouDeliver: paiseToRupees(own.commission),
    // Once the delivery mode is chosen
    expectedPayout: order.deliveryMode === 'SUPPLIER' ? paiseToRupees(own.payout + chargePaise) : order.deliveryMode === 'PLATFORM' ? paiseToRupees(sthiva.payout) : null,
  };
}
