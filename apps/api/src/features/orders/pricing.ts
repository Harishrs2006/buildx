// Server-side order pricing. All arithmetic is done in integer paise (BigInt for
// products) so totals never depend on floating-point error. Rounding is
// half-up, applied once per line; order totals are sums of the rounded lines.
//
// GST handling per product:
//   isGstInclusive = false → listed price is the taxable value; GST is added on top
//   isGstInclusive = true  → listed price already contains GST; taxable value is
//                            backed out: taxable = gross × 100 / (100 + rate)
// Bulk pricing: the tier with the highest minQty ≤ quantity replaces basePrice.

export const MAX_GST_RATE = 40; // highest Indian GST slab
const DISCRETE_UNITS = new Set(['PIECE', 'BAG', 'BUNDLE']);
const MAX_ORDER_TOTAL_PAISE = 10_00_00_000_00; // ₹10 crore — beyond this, ops should handle it manually

export class PricingError extends Error {
  constructor(message: string, readonly kind: 'INVALID_QUANTITY' | 'MISCONFIGURED' | 'TOO_LARGE') {
    super(message);
    this.name = 'PricingError';
  }
}

export type PricingProduct = {
  name: string;
  unit: string;
  basePrice: number;
  bulkPricing?: { minQty: number; price: number }[];
  gstRate: number;
  isGstInclusive: boolean;
  minOrderQuantity?: number;
};

export type PricedLine = {
  quantity: number;
  listPricePaise: number;   // basePrice
  unitPricePaise: number;   // price actually applied (tier or base), as listed
  tierMinQty: number | null;
  grossPaise: number;       // unitPrice × quantity, as listed (incl. GST if inclusive)
  taxablePaise: number;
  gstPaise: number;
  totalPaise: number;       // amount payable for the line
};

export type PricedOrder = {
  lines: PricedLine[];
  subtotalPaise: number;
  gstPaise: number;
  totalPaise: number;
};

/** Rupees (≤ 2 decimals expected) → integer paise. toFixed absorbs FP noise such as 1.005 * 100 = 100.4999… */
export function toPaise(rupees: number): number {
  if (!Number.isFinite(rupees) || rupees < 0) throw new PricingError(`Invalid amount: ${rupees}`, 'MISCONFIGURED');
  return Math.round(Number((rupees * 100).toFixed(6)));
}

export function paiseToRupees(paise: number): number {
  return paise / 100;
}

// Half-up division for non-negative BigInts
function roundDiv(n: bigint, d: bigint): bigint {
  return (2n * n + d) / (2n * d);
}

function toSafeNumber(n: bigint): number {
  if (n > BigInt(Number.MAX_SAFE_INTEGER)) throw new PricingError('Order value too large', 'TOO_LARGE');
  return Number(n);
}

/** Quantity → integer thousandths. Rejects non-finite, ≤0, >3 decimals, and fractional discrete units. */
export function quantityToMilli(product: Pick<PricingProduct, 'name' | 'unit' | 'minOrderQuantity'>, quantity: number): bigint {
  if (typeof quantity !== 'number' || !Number.isFinite(quantity) || quantity <= 0) {
    throw new PricingError(`Invalid quantity for ${product.name}`, 'INVALID_QUANTITY');
  }
  const milli = Math.round(quantity * 1000);
  if (Math.abs(quantity * 1000 - milli) > 1e-6) {
    throw new PricingError(`Quantity for ${product.name} can have at most 3 decimal places`, 'INVALID_QUANTITY');
  }
  if (DISCRETE_UNITS.has(product.unit) && !Number.isInteger(quantity)) {
    throw new PricingError(`${product.name} is sold in whole ${product.unit} units`, 'INVALID_QUANTITY');
  }
  const moq = product.minOrderQuantity ?? 1;
  if (quantity < moq) {
    throw new PricingError(`${product.name} requires a minimum of ${moq} ${product.unit}`, 'INVALID_QUANTITY');
  }
  return BigInt(milli);
}

function validRate(product: PricingProduct): bigint {
  const rate = product.gstRate;
  if (!Number.isFinite(rate) || rate < 0 || rate > MAX_GST_RATE) {
    throw new PricingError(`${product.name} has an invalid GST rate`, 'MISCONFIGURED');
  }
  // basis points, so fractional slabs like 0.25% and 3% stay exact
  return BigInt(Math.round(rate * 100));
}

/** Applicable unit price in paise for a quantity, honouring bulk tiers. */
export function unitPriceFor(product: PricingProduct, quantity: number): { unitPricePaise: number; tierMinQty: number | null } {
  const base = toPaise(product.basePrice);
  if (base <= 0) throw new PricingError(`${product.name} has no valid price`, 'MISCONFIGURED');

  let best: { minQty: number; price: number } | null = null;
  for (const tier of product.bulkPricing ?? []) {
    if (!Number.isFinite(tier?.minQty) || tier.minQty <= 0 || !Number.isFinite(tier?.price) || tier.price <= 0) {
      throw new PricingError(`${product.name} has an invalid bulk price tier`, 'MISCONFIGURED');
    }
    if (quantity >= tier.minQty && (!best || tier.minQty > best.minQty)) best = tier;
  }
  return best ? { unitPricePaise: toPaise(best.price), tierMinQty: best.minQty } : { unitPricePaise: base, tierMinQty: null };
}

export function priceLine(product: PricingProduct, quantity: number): PricedLine {
  const qtyMilli = quantityToMilli(product, quantity);
  const rateBp = validRate(product);
  const { unitPricePaise, tierMinQty } = unitPriceFor(product, quantity);

  const gross = roundDiv(BigInt(unitPricePaise) * qtyMilli, 1000n);
  let taxable: bigint;
  let gst: bigint;
  if (product.isGstInclusive) {
    taxable = roundDiv(gross * 10000n, 10000n + rateBp);
    gst = gross - taxable;
  } else {
    taxable = gross;
    gst = roundDiv(gross * rateBp, 10000n);
  }

  return {
    quantity,
    listPricePaise: toPaise(product.basePrice),
    unitPricePaise,
    tierMinQty,
    grossPaise: toSafeNumber(gross),
    taxablePaise: toSafeNumber(taxable),
    gstPaise: toSafeNumber(gst),
    totalPaise: toSafeNumber(taxable + gst),
  };
}

export function priceOrder(lines: { product: PricingProduct; quantity: number }[]): PricedOrder {
  const priced = lines.map(({ product, quantity }) => priceLine(product, quantity));
  const sum = (f: (l: PricedLine) => number) => priced.reduce((s, l) => s + f(l), 0);
  const order = {
    lines: priced,
    subtotalPaise: sum((l) => l.taxablePaise),
    gstPaise: sum((l) => l.gstPaise),
    totalPaise: sum((l) => l.totalPaise),
  };
  if (order.totalPaise > MAX_ORDER_TOTAL_PAISE) {
    throw new PricingError('Order value exceeds the online limit. Please contact BuildX support.', 'TOO_LARGE');
  }
  return order;
}
