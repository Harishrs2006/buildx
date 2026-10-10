import { describe, it, expect } from 'vitest';
import { priceLine, priceOrder, toPaise, PricingError, PricingProduct } from '../src/features/orders/pricing';

const base: PricingProduct = { name: 'OPC 53 Cement', unit: 'BAG', basePrice: 100, gstRate: 18, isGstInclusive: false };
const p = (over: Partial<PricingProduct>): PricingProduct => ({ ...base, ...over });

function kind(fn: () => unknown) {
  try {
    fn();
  } catch (e) {
    if (e instanceof PricingError) return e.kind;
    throw e;
  }
  return 'NO_ERROR';
}

describe('toPaise', () => {
  it('absorbs floating-point noise', () => {
    expect(toPaise(1.005)).toBe(101);
    expect(toPaise(0.1 + 0.2)).toBe(30);
    expect(toPaise(1180.5)).toBe(118050);
  });
  it('rejects negative and non-finite amounts', () => {
    expect(kind(() => toPaise(-1))).toBe('MISCONFIGURED');
    expect(kind(() => toPaise(NaN))).toBe('MISCONFIGURED');
  });
});

describe('GST-exclusive prices', () => {
  it('adds GST on top of the listed price', () => {
    const l = priceLine(base, 3);
    expect(l).toMatchObject({ grossPaise: 30000, taxablePaise: 30000, gstPaise: 5400, totalPaise: 35400 });
  });

  it('rounds GST half-up to the paisa', () => {
    // ₹10.10 × 5% = 50.5 paise → 51
    expect(priceLine(p({ basePrice: 10.1, gstRate: 5 }), 1).gstPaise).toBe(51);
    // ₹10.01 × 5% = 50.05 paise → 50
    expect(priceLine(p({ basePrice: 10.01, gstRate: 5 }), 1).gstPaise).toBe(50);
  });

  it('handles fractional and zero slabs exactly', () => {
    expect(priceLine(p({ basePrice: 1000, gstRate: 0.25 }), 1).gstPaise).toBe(250);
    expect(priceLine(p({ basePrice: 1000, gstRate: 3 }), 1).gstPaise).toBe(3000);
    expect(priceLine(p({ basePrice: 1000, gstRate: 0 }), 1)).toMatchObject({ gstPaise: 0, totalPaise: 100000 });
  });
});

describe('GST-inclusive prices', () => {
  it('backs GST out of the listed price instead of adding it again', () => {
    const l = priceLine(p({ basePrice: 118, isGstInclusive: true }), 2);
    expect(l).toMatchObject({ grossPaise: 23600, taxablePaise: 20000, gstPaise: 3600, totalPaise: 23600 });
  });

  it('rounds the taxable value and keeps taxable + GST = listed price', () => {
    // ₹100 incl. 18%: taxable 84.7457… → 84.75, GST = 15.25
    const l = priceLine(p({ basePrice: 100, isGstInclusive: true }), 1);
    expect(l).toMatchObject({ taxablePaise: 8475, gstPaise: 1525, totalPaise: 10000 });
  });

  it('charges exactly the listed price at every GST slab', () => {
    for (const gstRate of [0, 0.25, 3, 5, 12, 18, 28, 40]) {
      const l = priceLine(p({ basePrice: 399.99, isGstInclusive: true, gstRate }), 7);
      expect(l.totalPaise).toBe(39999 * 7);
      expect(l.taxablePaise + l.gstPaise).toBe(l.totalPaise);
    }
  });
});

describe('bulk / tier pricing', () => {
  const tiered = p({ basePrice: 400, bulkPricing: [{ minQty: 100, price: 360 }, { minQty: 50, price: 380 }] });

  it('uses the highest tier whose minQty ≤ quantity (boundaries inclusive)', () => {
    expect(priceLine(tiered, 49)).toMatchObject({ unitPricePaise: 40000, tierMinQty: null });
    expect(priceLine(tiered, 50)).toMatchObject({ unitPricePaise: 38000, tierMinQty: 50 });
    expect(priceLine(tiered, 99)).toMatchObject({ unitPricePaise: 38000, tierMinQty: 50 });
    expect(priceLine(tiered, 100)).toMatchObject({ unitPricePaise: 36000, tierMinQty: 100 });
    expect(priceLine(tiered, 100).listPricePaise).toBe(40000);
  });

  it('combines tiers with GST-inclusive prices', () => {
    const l = priceLine({ ...tiered, isGstInclusive: true, gstRate: 28 }, 50);
    expect(l.totalPaise).toBe(38000 * 50);
    expect(l.taxablePaise + l.gstPaise).toBe(l.totalPaise);
  });

  it('refuses to price with a broken tier rather than guessing', () => {
    expect(kind(() => priceLine(p({ bulkPricing: [{ minQty: 10, price: 0 }] }), 20))).toBe('MISCONFIGURED');
    expect(kind(() => priceLine(p({ bulkPricing: [{ minQty: -5, price: 90 }] }), 20))).toBe('MISCONFIGURED');
    expect(kind(() => priceLine(p({ bulkPricing: [{ minQty: NaN, price: 90 }] }), 20))).toBe('MISCONFIGURED');
  });
});

describe('quantities and minimum order', () => {
  it('rejects non-positive, non-finite and over-precise quantities', () => {
    for (const q of [0, -1, NaN, Infinity, -Infinity]) expect(kind(() => priceLine(base, q))).toBe('INVALID_QUANTITY');
    expect(kind(() => priceLine(p({ unit: 'TON' }), 1.0005))).toBe('INVALID_QUANTITY');
    expect(kind(() => priceLine(base, '5' as unknown as number))).toBe('INVALID_QUANTITY');
  });

  it('requires whole units for discrete products but allows fractions for bulk units', () => {
    expect(kind(() => priceLine(base, 2.5))).toBe('INVALID_QUANTITY'); // BAG
    expect(kind(() => priceLine(p({ unit: 'PIECE' }), 0.5))).toBe('INVALID_QUANTITY');
    const ton = priceLine(p({ unit: 'TON', basePrice: 1200.4 }), 2.5);
    expect(ton.grossPaise).toBe(300100);
  });

  it('enforces the minimum order quantity at the boundary', () => {
    const moq = p({ minOrderQuantity: 50 });
    expect(kind(() => priceLine(moq, 49))).toBe('INVALID_QUANTITY');
    expect(kind(() => priceLine(moq, 50))).toBe('NO_ERROR');
  });
});

describe('misconfigured products', () => {
  it('rejects invalid GST rates and prices', () => {
    for (const gstRate of [-1, 41, NaN]) expect(kind(() => priceLine(p({ gstRate }), 1))).toBe('MISCONFIGURED');
    expect(kind(() => priceLine(p({ basePrice: 0 }), 1))).toBe('MISCONFIGURED');
    expect(kind(() => priceLine(p({ basePrice: -10 }), 1))).toBe('MISCONFIGURED');
  });
});

describe('order totals', () => {
  it('are sums of the individually rounded lines', () => {
    const order = priceOrder([
      { product: p({ basePrice: 10.1, gstRate: 5 }), quantity: 1 },
      { product: p({ basePrice: 100, isGstInclusive: true }), quantity: 1 },
      { product: p({ basePrice: 400, gstRate: 28 }), quantity: 10 },
    ]);
    expect(order.subtotalPaise).toBe(1010 + 8475 + 400000);
    expect(order.gstPaise).toBe(51 + 1525 + 112000);
    expect(order.totalPaise).toBe(order.subtotalPaise + order.gstPaise);
  });

  it('refuses absurd totals instead of overflowing', () => {
    expect(kind(() => priceOrder([{ product: p({ basePrice: 99_999.99, unit: 'TON' }), quantity: 1_000_000 }]))).toBe('TOO_LARGE');
  });
});
