import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { Types } from 'mongoose';
import { seedUser, seedSupplier, seedProduct, newKey, SITE, startDb, stopDb, clearDb, makeApp } from './helpers';
import { Category } from '../src/infrastructure/database/models/Category.model';
import { CatalogItem } from '../src/infrastructure/database/models/CatalogItem.model';
import { Order } from '../src/infrastructure/database/models/Order.model';
import { addPercent, buyerProduct, payoutFor, supplierEarnings } from '../src/features/orders/commission';

const app = makeApp();
const api = (path: string) => `/api/v1${path}`;

describe('commission maths', () => {
  it('adds a percent to the paisa, half-up', () => {
    expect(addPercent(380, 10)).toBe(418);
    expect(addPercent(99.99, 2.5)).toBe(102.49); // 102.48975
    expect(addPercent(100, 0)).toBe(100);
  });

  it('scales base price and bulk tiers', () => {
    const p = buyerProduct({ name: 'x', unit: 'BAG', basePrice: 400, bulkPricing: [{ minQty: 50, price: 380 }], gstRate: 28, isGstInclusive: false }, 5);
    expect(p.basePrice).toBe(420);
    expect(p.bulkPricing).toEqual([{ minQty: 50, price: 399 }]);
  });

  it('pays the supplier their price, plus the rate difference when they deliver', () => {
    const line = { supplierLineTotal: 1000, lineTotal: 1100, commissionPercent: 10, supplierDeliveryPercent: 4 };
    expect(payoutFor(line, false)).toEqual({ payoutPaise: 100000, commissionPaise: 10000 });
    expect(payoutFor(line, true)).toEqual({ payoutPaise: 106000, commissionPaise: 4000 });
    // No lower rate set: same either way
    expect(payoutFor({ ...line, supplierDeliveryPercent: undefined }, true)).toEqual({ payoutPaise: 100000, commissionPaise: 10000 });
  });

  it('summarises earnings; old orders without a supplier side pay the full line', () => {
    const e = supplierEarnings({ total: 1100, items: [{ lineTotal: 1100, supplierLineTotal: 1000, commissionPercent: 10, supplierDeliveryPercent: 4 }] });
    expect(e).toMatchObject({ payoutIfSthivaDelivers: 1000, commissionIfSthivaDelivers: 100, payoutIfYouDeliver: 1060, commissionIfYouDeliver: 40, expectedPayout: null });
    expect(supplierEarnings({ total: 500, items: [{ lineTotal: 500 }], deliveryMode: 'PLATFORM' }).expectedPayout).toBe(500);
  });
});

describe('one item, one price', () => {
  let buyer: Awaited<ReturnType<typeof seedUser>>;
  let s1: Awaited<ReturnType<typeof seedSupplier>>;
  let s2: Awaited<ReturnType<typeof seedSupplier>>;
  let cat: Types.ObjectId;
  let item: Types.ObjectId;

  beforeAll(startDb);
  afterAll(stopDb);
  beforeEach(async () => {
    await clearDb();
    buyer = await seedUser('buyer');
    s1 = await seedSupplier('s1');
    s2 = await seedSupplier('s2');
    cat = (await Category.create({ name: 'Cement', slug: 'cement', commission: { platformDeliveryPercent: 10, supplierDeliveryPercent: 4 } }))._id;
    item = (await CatalogItem.create({ name: 'PPC 50kg', slug: 'ppc', categoryId: cat, unit: 'BAG', createdBy: { role: 'ADMIN' } }))._id;
  });

  const listing = (s: typeof s1, extra: Record<string, unknown>) =>
    seedProduct(s.profile._id, { categoryId: cat, catalogItemId: item, gstRate: 0, isGstInclusive: false, ...extra });

  it('lists each item once at the cheapest supplier price plus commission', async () => {
    await listing(s1, { basePrice: 400 });
    const cheap = await listing(s2, { basePrice: 380, bulkPricing: [{ minQty: 100, price: 370 }] });
    const res = await request(app).get(api('/products'));
    expect(res.status).toBe(200);
    expect(res.body.products).toHaveLength(1);
    expect(res.body.products[0]).toMatchObject({ _id: cheap._id.toString(), basePrice: 418, sellerCount: 2, bulkPricing: [{ minQty: 100, price: 407 }] });
    expect(res.body.pagination.total).toBe(1);

    const one = await request(app).get(api(`/products/${cheap._id}`));
    expect(one.body.basePrice).toBe(418);
  });

  it('hides categories without a commission and refuses to order them', async () => {
    const other = await Category.create({ name: 'Paint', slug: 'paint' });
    const paint = await seedProduct(s1.profile._id, { categoryId: other._id, basePrice: 300 });
    expect((await request(app).get(api('/products'))).body.products.map((p: { _id: string }) => p._id)).not.toContain(paint._id.toString());
    expect((await request(app).get(api(`/products/${paint._id}`))).status).toBe(404);
    const res = await request(app).post(api('/orders')).set(buyer.headers).set('Idempotency-Key', newKey())
      .send({ items: [{ productId: paint._id.toString(), quantity: 1 }], deliveryAddress: SITE });
    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/isn't on sale yet/);
  });

  it('orders go to the cheapest supplier with stock, priced with commission, with the supplier side stored', async () => {
    const dear = await listing(s1, { basePrice: 400 });
    const cheap = await listing(s2, { basePrice: 380, stockQuantity: 5 });

    // Buyer added s1's listing; s2 is cheaper but has only 5
    const big = await request(app).post(api('/orders')).set(buyer.headers).set('Idempotency-Key', newKey())
      .send({ items: [{ productId: dear._id.toString(), quantity: 10 }], deliveryAddress: SITE });
    expect(big.status).toBe(201);
    expect(big.body.data.total).toBe(4400); // 400 × 1.10 × 10
    expect((await Order.findById(big.body.data.orderId).lean())!.supplierId.toString()).toBe(s1.profile._id.toString());

    const small = await request(app).post(api('/orders')).set(buyer.headers).set('Idempotency-Key', newKey())
      .send({ items: [{ productId: dear._id.toString(), quantity: 5 }], deliveryAddress: SITE });
    expect(small.body.data.total).toBe(2090); // 380 × 1.10 × 5
    const o = (await Order.findById(small.body.data.orderId).lean())!;
    expect(o.supplierId.toString()).toBe(s2.profile._id.toString());
    expect(o.items[0]).toMatchObject({ productId: cheap._id, pricePerUnit: 418, supplierUnitPrice: 380, supplierLineTotal: 1900, commissionPercent: 10, supplierDeliveryPercent: 4 });
    expect(o).toMatchObject({ total: 2090, supplierTotal: 1900, commissionTotal: 190 });

    // The supplier sees what they earn
    const mine = await request(app).get(api('/suppliers/me/orders')).set(s2.headers);
    expect(mine.body.data[0].earnings).toMatchObject({ orderValue: 2090, payoutIfSthivaDelivers: 1900, payoutIfYouDeliver: 2014, commissionIfYouDeliver: 76 });
  });

  it('a cart needs one supplier who has every item', async () => {
    const item2 = (await CatalogItem.create({ name: 'Sand', slug: 'sand', categoryId: cat, unit: 'BAG', createdBy: { role: 'ADMIN' } }))._id;
    const a1 = await listing(s1, { basePrice: 400 });
    await listing(s2, { basePrice: 300 });
    const sand1 = await seedProduct(s1.profile._id, { categoryId: cat, catalogItemId: item2, basePrice: 100, gstRate: 0, isGstInclusive: false });

    const res = await request(app).post(api('/orders')).set(buyer.headers).set('Idempotency-Key', newKey())
      .send({ items: [{ productId: a1._id.toString(), quantity: 1 }, { productId: sand1._id.toString(), quantity: 1 }], deliveryAddress: SITE });
    expect(res.status).toBe(201);
    expect(res.body.data.total).toBe(550); // only s1 has both: (400 + 100) × 1.10
  });
});
