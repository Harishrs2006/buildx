// Price maths the seller sees while typing. Mirrors apps/api: features/orders/pricing.ts (GST) and
// features/suppliers/product-rules.ts (bulk prices), so the form never promises what the server refuses.

export const GST_RATES = [0, 5, 12, 18, 28] as const;

export type Tier = { minQty: number; price: number };

/** What the buyer pays per unit, and how it splits into taxable value and GST */
export function gstBreakdown(price: number, rate: number, inclusive: boolean) {
  if (!(price > 0)) return null;
  const taxable = inclusive ? price / (1 + rate / 100) : price;
  const gst = inclusive ? price - taxable : (price * rate) / 100;
  return { taxable, gst, total: taxable + gst };
}

/** Same rule as the API: quantities step up, prices step down, all below the normal price */
export function bulkPricingProblem(tiers: Tier[], basePrice: number | undefined, minOrder = 1): string | null {
  const sorted = [...tiers].sort((a, b) => a.minQty - b.minQty);
  for (let i = 0; i < sorted.length; i++) {
    const t = sorted[i];
    if (!Number.isInteger(t.minQty) || t.minQty < 2) return 'Each bulk price needs a whole quantity of 2 or more';
    if (!(t.price > 0)) return 'Each bulk price needs a price';
    if (i > 0 && t.minQty === sorted[i - 1].minQty) return `Two bulk prices start at ${t.minQty}`;
    if (t.minQty <= minOrder) return `A bulk price must start above the minimum order (${minOrder})`;
    if (basePrice !== undefined && basePrice > 0 && t.price >= basePrice) return 'Bulk prices must be lower than the normal price';
    if (i > 0 && t.price >= sorted[i - 1].price) return 'Bigger quantities need a lower price than smaller ones';
  }
  return null;
}
