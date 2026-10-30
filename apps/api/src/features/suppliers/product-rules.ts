// Pricing rules shared by product validation (supplier.routes.ts) and edits (supplier.controller.ts)

type Tier = { minQty: number; price: number };
/** Bulk tiers must step up in quantity and down in price, all below the base price. Returns an error message or null. */
export function bulkPricingProblem(tiers: Tier[] | undefined, basePrice: number | undefined, minOrder = 1): string | null {
  if (!tiers?.length) return null;
  const sorted = [...tiers].sort((a, b) => a.minQty - b.minQty);
  for (let i = 0; i < sorted.length; i++) {
    const t = sorted[i];
    if (i > 0 && t.minQty === sorted[i - 1].minQty) return `Two bulk prices start at ${t.minQty}`;
    if (t.minQty <= minOrder) return `A bulk price must start above the minimum order (${minOrder})`;
    if (basePrice !== undefined && t.price >= basePrice) return 'Bulk prices must be lower than the normal price';
    if (i > 0 && t.price >= sorted[i - 1].price) return 'Bigger quantities need a lower price than smaller ones';
  }
  return null;
}
