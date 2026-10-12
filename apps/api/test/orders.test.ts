import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import {
  seedUser, seedSupplier, seedDriver, seedProduct, newKey, SITE,
  startDb, stopDb, clearDb, makeApp,
} from './helpers';
import { Order } from '../src/infrastructure/database/models/Order.model';
import { Product } from '../src/infrastructure/database/models/Product.model';
import { DeliveryPartner } from '../src/infrastructure/database/models/DeliveryPartner.model';

const app = makeApp();
const api = (path: string) => `/api/v1${path}`;

let buyer: Awaited<ReturnType<typeof seedUser>>;
let buyer2: Awaited<ReturnType<typeof seedUser>>;
let supplier: Awaited<ReturnType<typeof seedSupplier>>;
let supplier2: Awaited<ReturnType<typeof seedSupplier>>;
let driver: Awaited<ReturnType<typeof seedDriver>>;
let driver2: Awaited<ReturnType<typeof seedDriver>>;

beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => {
  vi.restoreAllMocks();
  await clearDb();
  buyer = await seedUser('buyer');
  buyer2 = await seedUser('buyer2');
  supplier = await seedSupplier('supplier');
  supplier2 = await seedSupplier('supplier2');
  driver = await seedDriver('driver');
  driver2 = await seedDriver('driver2');
});

type Who = { headers: Record<string, string> };
const place = (who: Who, items: unknown[], opts: { key?: string | null; body?: Record<string, unknown> } = {}) => {
  const req = request(app).post(api('/orders')).set(who.headers);
  if (opts.key !== null) req.set('Idempotency-Key', opts.key ?? newKey());
  return req.send({ items, deliveryAddress: SITE, ...opts.body });
};
const stockOf = async (id: unknown) => (await Product.findById(id).lean())!.stockQuantity;
const supplierStatus = (who: Who, id: unknown, status: string, reason?: string) =>
  request(app).patch(api(`/suppliers/me/orders/${id}/status`)).set(who.headers).send({ status, reason });
const driverStatus = (who: Who, id: unknown, status: string) =>
  request(app).patch(api(`/delivery/orders/${id}/status`)).set(who.headers).send({ status });
const assign = (who: Who, id: unknown) => request(app).post(api(`/delivery/orders/${id}/assign`)).set(who.headers);
const cancelAsBuyer = (who: Who, id: unknown) => request(app).post(api(`/orders/${id}/cancel`)).set(who.headers).send({});
const cod = (who: Who, id: unknown, amount: number) =>
  request(app).post(api(`/delivery/orders/${id}/cod`)).set(who.headers).send({ amount });

async function placedOrder(qty = 10, productExtra: Record<string, unknown> = {}) {
  const product = await seedProduct(supplier.profile._id, productExtra);
  const res = await place(buyer, [{ productId: product._id.toString(), quantity: qty }]);
  expect(res.status).toBe(201);
  return { product, orderId: res.body.data.orderId as string, res };
}

async function deliveredOrder() {
  const { product, orderId } = await placedOrder(10);
  expect((await supplierStatus(supplier, orderId, 'READY_FOR_PICKUP')).status).toBe(200);
  expect((await assign(driver, orderId)).status).toBe(200);
  expect((await driverStatus(driver, orderId, 'PICKED_UP')).status).toBe(200);
  expect((await driverStatus(driver, orderId, 'DELIVERED')).status).toBe(200);
  return { product, orderId };
}

// ─── Inventory safety ───────────────────────────────────────────────────────

describe('order creation and stock', () => {
  it('prices on the server, deducts stock once and ignores client-supplied prices', async () => {
    const product = await seedProduct(supplier.profile._id, { basePrice: 400, gstRate: 28, stockQuantity: 100 });
    const res = await place(buyer, [{ productId: product._id.toString(), quantity: 10, pricePerUnit: 1, basePrice: 1 }], {
      body: { total: 1, subtotal: 1, gstAmount: 0 },
    });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ subtotal: 4000, gstAmount: 1120, total: 5120, status: 'CONFIRMED', replayed: false });
    expect(await stockOf(product._id)).toBe(90);
    const order = await Order.findById(res.body.data.orderId).lean();
    expect(order).toMatchObject({ inventoryState: 'DEDUCTED', paymentStatus: 'PENDING', paymentMethod: 'COD' });
    expect(order!.items[0]).toMatchObject({ pricePerUnit: 400, quantity: 10, isGstInclusive: false, taxableValue: 4000, gstAmount: 1120, lineTotal: 5120 });
    expect(order!.deliveryAddress.contactPhone).toBe('9876500000'); // normalised from +91…
  });

  it('refuses when stock is insufficient and changes nothing', async () => {
    const product = await seedProduct(supplier.profile._id, { stockQuantity: 5 });
    const res = await place(buyer, [{ productId: product._id.toString(), quantity: 6 }]);
    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/Only 5 BAG/);
    expect(await stockOf(product._id)).toBe(5);
    expect(await Order.countDocuments()).toBe(0);
  });

  it('two buyers racing for the final stock: exactly one wins', async () => {
    const product = await seedProduct(supplier.profile._id, { stockQuantity: 5 });
    const items = [{ productId: product._id.toString(), quantity: 5 }];
    const results = await Promise.all([place(buyer, items), place(buyer2, items)]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(await stockOf(product._id)).toBe(0);
    expect(await Order.countDocuments()).toBe(1);
  });

  it('many concurrent orders never oversell', async () => {
    const product = await seedProduct(supplier.profile._id, { stockQuantity: 3 });
    const items = [{ productId: product._id.toString(), quantity: 1 }];
    const results = await Promise.all(Array.from({ length: 10 }, (_, i) => place(i % 2 ? buyer : buyer2, items)));
    expect(results.filter((r) => r.status === 201)).toHaveLength(3);
    expect(results.filter((r) => r.status === 409)).toHaveLength(7);
    expect(await stockOf(product._id)).toBe(0);
    expect(await Order.countDocuments()).toBe(3);
  });

  it('rolls back earlier items when a later item is out of stock', async () => {
    const plenty = await seedProduct(supplier.profile._id, { stockQuantity: 100 });
    const scarce = await seedProduct(supplier.profile._id, { stockQuantity: 1 });
    const res = await place(buyer, [
      { productId: plenty._id.toString(), quantity: 10 },
      { productId: scarce._id.toString(), quantity: 2 },
    ]);
    expect(res.status).toBe(409);
    expect(await stockOf(plenty._id)).toBe(100);
    expect(await stockOf(scarce._id)).toBe(1);
    expect(await Order.countDocuments()).toBe(0);
  });

  it('restores stock when saving the order fails after the deduction', async () => {
    const product = await seedProduct(supplier.profile._id, { stockQuantity: 50 });
    vi.spyOn(Order, 'create').mockRejectedValueOnce(new Error('simulated write failure'));
    const res = await place(buyer, [{ productId: product._id.toString(), quantity: 20 }]);
    expect(res.status).toBe(500);
    expect(await stockOf(product._id)).toBe(50);
    expect((await Product.findById(product._id).lean())!.totalSold).toBe(0);
    expect(await Order.countDocuments()).toBe(0);
  });

  it('rejects unavailable products, mixed suppliers and duplicate lines', async () => {
    const inactive = await seedProduct(supplier.profile._id, { status: 'DISCONTINUED' });
    const mine = await seedProduct(supplier.profile._id);
    const theirs = await seedProduct(supplier2.profile._id);
    expect((await place(buyer, [{ productId: inactive._id.toString(), quantity: 1 }])).status).toBe(409);
    expect((await place(buyer, [{ productId: new mongoose.Types.ObjectId().toString(), quantity: 1 }])).status).toBe(409);
    expect((await place(buyer, [
      { productId: mine._id.toString(), quantity: 1 },
      { productId: theirs._id.toString(), quantity: 1 },
    ])).status).toBe(400);
    expect((await place(buyer, [
      { productId: mine._id.toString(), quantity: 1 },
      { productId: mine._id.toString(), quantity: 2 },
    ])).status).toBe(400);
    expect(await stockOf(mine._id)).toBe(100);
    expect(await Order.countDocuments()).toBe(0);
  });
});

describe('quantity validation and minimum order', () => {
  it.each([
    ['zero', 0], ['negative', -3], ['string', '10'], ['null', null], ['fractional bag', 1.5], ['too precise', 1.0001],
  ])('rejects a %s quantity', async (_label, quantity) => {
    const product = await seedProduct(supplier.profile._id, { stockQuantity: 100 });
    const res = await place(buyer, [{ productId: product._id.toString(), quantity }]);
    expect(res.status).toBe(400);
    expect(await stockOf(product._id)).toBe(100);
  });

  it('enforces the product minimum order quantity', async () => {
    const product = await seedProduct(supplier.profile._id, { minOrderQuantity: 50, stockQuantity: 500 });
    const below = await place(buyer, [{ productId: product._id.toString(), quantity: 49 }]);
    expect(below.status).toBe(400);
    expect(below.body.error.message).toMatch(/minimum of 50/);
    expect((await place(buyer, [{ productId: product._id.toString(), quantity: 50 }])).status).toBe(201);
    expect(await stockOf(product._id)).toBe(450);
  });

  it('accepts fractional quantities for bulk units', async () => {
    const product = await seedProduct(supplier.profile._id, { unit: 'TON', basePrice: 1200, stockQuantity: 10, gstRate: 5 });
    const res = await place(buyer, [{ productId: product._id.toString(), quantity: 2.5 }]);
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ subtotal: 3000, gstAmount: 150, total: 3150 });
    expect(await stockOf(product._id)).toBe(7.5);
  });
});

// ─── Pricing through the API ────────────────────────────────────────────────

describe('server-side pricing', () => {
  it('does not add GST twice to GST-inclusive prices', async () => {
    const product = await seedProduct(supplier.profile._id, { basePrice: 118, gstRate: 18, isGstInclusive: true });
    const res = await place(buyer, [{ productId: product._id.toString(), quantity: 2 }]);
    expect(res.body.data).toMatchObject({ subtotal: 200, gstAmount: 36, total: 236 });
    const item = (await Order.findById(res.body.data.orderId).lean())!.items[0];
    expect(item).toMatchObject({ pricePerUnit: 118, subtotal: 236, taxableValue: 200, gstAmount: 36, lineTotal: 236 });
  });

  it('applies bulk tiers at their boundaries', async () => {
    const product = await seedProduct(supplier.profile._id, {
      basePrice: 400, gstRate: 28, stockQuantity: 1000,
      bulkPricing: [{ minQty: 50, price: 380 }, { minQty: 100, price: 360 }],
    });
    const id = product._id.toString();
    expect((await place(buyer, [{ productId: id, quantity: 49 }])).body.data.subtotal).toBe(49 * 400);
    expect((await place(buyer, [{ productId: id, quantity: 50 }])).body.data.subtotal).toBe(50 * 380);
    const big = await place(buyer, [{ productId: id, quantity: 100 }]);
    expect(big.body.data).toMatchObject({ subtotal: 36000, gstAmount: 10080, total: 46080 });
    const item = (await Order.findById(big.body.data.orderId).lean())!.items[0];
    expect(item).toMatchObject({ pricePerUnit: 360, listPrice: 400, tierMinQty: 100 });
  });

  it('quote matches the order that is then placed', async () => {
    const product = await seedProduct(supplier.profile._id, { basePrice: 99.99, gstRate: 18, isGstInclusive: true });
    const items = [{ productId: product._id.toString(), quantity: 7 }];
    const q = await request(app).post(api('/orders/quote')).set(buyer.headers).send({ items });
    expect(q.status).toBe(200);
    const res = await place(buyer, items, { body: { expectedTotal: q.body.data.total } });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ subtotal: q.body.data.subtotal, gstAmount: q.body.data.gstAmount, total: q.body.data.total });
    expect(await stockOf(product._id)).toBe(93); // quoting doesn't reserve stock
  });

  it('refuses the order if the price changed after the buyer reviewed it', async () => {
    const product = await seedProduct(supplier.profile._id, { basePrice: 400 });
    const res = await place(buyer, [{ productId: product._id.toString(), quantity: 1 }], { body: { expectedTotal: 400 } });
    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/Prices changed/);
    expect(await stockOf(product._id)).toBe(100);
  });

  it('refuses misconfigured products instead of mispricing them', async () => {
    const product = await seedProduct(supplier.profile._id);
    await Product.collection.updateOne({ _id: product._id }, { $set: { gstRate: 99 } }); // bypass schema, like bad legacy data
    const res = await place(buyer, [{ productId: product._id.toString(), quantity: 1 }]);
    expect(res.status).toBe(409);
    expect(await stockOf(product._id)).toBe(100);
  });

  it('rejects invalid pricing data on supplier product edits', async () => {
    const product = await seedProduct(supplier.profile._id);
    for (const body of [{ stockQuantity: -5 }, { gstRate: 50 }, { basePrice: -1 }]) {
      const res = await request(app).patch(api(`/suppliers/me/products/${product._id}`)).set(supplier.headers).send(body);
      expect(res.status, JSON.stringify(body)).toBe(400);
    }
    expect(await Product.findById(product._id).lean()).toMatchObject({ stockQuantity: 100, gstRate: 28, basePrice: 400 });
  });
});

// ─── Duplicate submissions ──────────────────────────────────────────────────

describe('duplicate order submissions', () => {
  it('requires an Idempotency-Key', async () => {
    const product = await seedProduct(supplier.profile._id);
    expect((await place(buyer, [{ productId: product._id.toString(), quantity: 1 }], { key: null })).status).toBe(400);
    expect((await place(buyer, [{ productId: product._id.toString(), quantity: 1 }], { key: 'short' })).status).toBe(400);
    expect(await stockOf(product._id)).toBe(100);
  });

  it('a retried request returns the original order without deducting again', async () => {
    const product = await seedProduct(supplier.profile._id);
    const key = newKey();
    const items = [{ productId: product._id.toString(), quantity: 4 }];
    const first = await place(buyer, items, { key });
    const retry = await place(buyer, items, { key });
    expect(first.status).toBe(201);
    expect(retry.status).toBe(200);
    expect(retry.body.data).toMatchObject({ orderId: first.body.data.orderId, replayed: true });
    expect(await stockOf(product._id)).toBe(96);
    expect(await Order.countDocuments()).toBe(1);
  });

  it('concurrent double-taps create one order and deduct once', async () => {
    const product = await seedProduct(supplier.profile._id);
    const key = newKey();
    const items = [{ productId: product._id.toString(), quantity: 4 }];
    const results = await Promise.all([1, 2, 3].map(() => place(buyer, items, { key })));
    expect(results.every((r) => r.status === 201 || r.status === 200)).toBe(true);
    expect(results.filter((r) => r.status === 201)).toHaveLength(1);
    expect(new Set(results.map((r) => r.body.data.orderId)).size).toBe(1);
    expect(await stockOf(product._id)).toBe(96);
    expect(await Order.countDocuments()).toBe(1);
  });

  it('reusing a key for a different cart is refused', async () => {
    const product = await seedProduct(supplier.profile._id);
    const key = newKey();
    await place(buyer, [{ productId: product._id.toString(), quantity: 4 }], { key });
    const other = await place(buyer, [{ productId: product._id.toString(), quantity: 5 }], { key });
    expect(other.status).toBe(409);
    expect(await stockOf(product._id)).toBe(96);
  });

  it('keys are scoped per buyer', async () => {
    const product = await seedProduct(supplier.profile._id);
    const key = newKey();
    const items = [{ productId: product._id.toString(), quantity: 1 }];
    expect((await place(buyer, items, { key })).status).toBe(201);
    expect((await place(buyer2, items, { key })).status).toBe(201);
    expect(await stockOf(product._id)).toBe(98);
  });
});

// ─── Cancellation and rejection ─────────────────────────────────────────────

describe('cancellation restores stock exactly once', () => {
  it('buyer cancel restores stock; repeats are harmless', async () => {
    const { product, orderId } = await placedOrder(10);
    expect(await stockOf(product._id)).toBe(90);

    const first = await cancelAsBuyer(buyer, orderId);
    expect(first.status).toBe(200);
    expect(first.body.data).toMatchObject({ status: 'CANCELLED', cancelledBy: 'BUYER', inventoryState: 'RESTORED' });
    expect(await stockOf(product._id)).toBe(100);

    const again = await cancelAsBuyer(buyer, orderId);
    expect(again.status).toBe(200);
    expect(await stockOf(product._id)).toBe(100);
    expect((await Product.findById(product._id).lean())!.totalSold).toBe(0);
  });

  it('concurrent cancel and reject requests restore stock once', async () => {
    const { product, orderId } = await placedOrder(10);
    const results = await Promise.all([
      cancelAsBuyer(buyer, orderId),
      cancelAsBuyer(buyer, orderId),
      supplierStatus(supplier, orderId, 'CANCELLED', 'Out of stock at godown'),
      supplierStatus(supplier, orderId, 'CANCELLED'),
    ]);
    results.forEach((r) => expect(r.status).toBe(200));
    expect(await stockOf(product._id)).toBe(100);
  });

  it('supplier rejection restores stock and records the reason', async () => {
    const { product, orderId } = await placedOrder(10);
    const res = await supplierStatus(supplier, orderId, 'CANCELLED', 'Truck unavailable');
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ status: 'CANCELLED', cancelledBy: 'SUPPLIER', cancellationReason: 'Truck unavailable' });
    expect(await stockOf(product._id)).toBe(100);
    expect((await supplierStatus(supplier, orderId, 'CANCELLED')).status).toBe(200);
    expect(await stockOf(product._id)).toBe(100);
  });

  it('cancelling is allowed while ready for pickup but not once a driver is assigned', async () => {
    const { product, orderId } = await placedOrder(10);
    await supplierStatus(supplier, orderId, 'READY_FOR_PICKUP');
    expect((await assign(driver, orderId)).status).toBe(200);

    expect((await cancelAsBuyer(buyer, orderId)).status).toBe(409);
    expect((await supplierStatus(supplier, orderId, 'CANCELLED')).status).toBe(409);
    expect(await stockOf(product._id)).toBe(90);
  });

  it('a cancel racing a driver assignment: exactly one wins, stock stays consistent', async () => {
    const { product, orderId } = await placedOrder(10);
    await supplierStatus(supplier, orderId, 'READY_FOR_PICKUP');
    const [c, a] = await Promise.all([cancelAsBuyer(buyer, orderId), assign(driver, orderId)]);
    expect([c.status, a.status].sort()).toEqual([200, 409]);
    const order = await Order.findById(orderId).lean();
    expect(await stockOf(product._id)).toBe(order!.status === 'CANCELLED' ? 100 : 90);
  });

  it("restores stock for orders created before inventoryState existed", async () => {
    const { product, orderId } = await placedOrder(10);
    await Order.collection.updateOne({ _id: new mongoose.Types.ObjectId(orderId) }, { $unset: { inventoryState: '' } });
    expect((await cancelAsBuyer(buyer, orderId)).status).toBe(200);
    expect(await stockOf(product._id)).toBe(100);
    expect((await cancelAsBuyer(buyer, orderId)).status).toBe(200);
    expect(await stockOf(product._id)).toBe(100);
  });

  it("a buyer can't cancel someone else's order", async () => {
    const { product, orderId } = await placedOrder(10);
    expect((await cancelAsBuyer(buyer2, orderId)).status).toBe(404);
    expect(await stockOf(product._id)).toBe(90);
  });
});

// ─── State machine ──────────────────────────────────────────────────────────

describe('order state machine', () => {
  it('suppliers cannot skip delivery steps or drive a platform delivery', async () => {
    const { orderId } = await placedOrder();
    for (const status of ['ASSIGNED', 'PICKED_UP']) {
      expect((await supplierStatus(supplier, orderId, status)).status, status).toBe(400);
    }
    // Must dispatch before delivering
    expect((await supplierStatus(supplier, orderId, 'DELIVERED')).status).toBe(409);
    await supplierStatus(supplier, orderId, 'READY_FOR_PICKUP');
    await assign(driver, orderId);
    await driverStatus(driver, orderId, 'PICKED_UP');
    // Once a BuildX driver has it, the supplier can't move it
    expect((await supplierStatus(supplier, orderId, 'IN_TRANSIT')).status).toBe(409);
    expect((await supplierStatus(supplier, orderId, 'DELIVERED')).status).toBe(409);
    expect((await Order.findById(orderId).lean())!.status).toBe('PICKED_UP');
  });

  it('rejects out-of-order driver updates', async () => {
    const { orderId } = await placedOrder();
    await supplierStatus(supplier, orderId, 'READY_FOR_PICKUP');
    await assign(driver, orderId);
    expect((await driverStatus(driver, orderId, 'IN_TRANSIT')).status).toBe(409);
    expect((await driverStatus(driver, orderId, 'DELIVERED')).status).toBe(409);
    expect((await driverStatus(driver, orderId, 'CANCELLED')).status).toBe(400);
    expect((await Order.findById(orderId).lean())!.status).toBe('ASSIGNED');
  });

  it('cannot reopen a cancelled order', async () => {
    const { orderId } = await placedOrder();
    await cancelAsBuyer(buyer, orderId);
    expect((await supplierStatus(supplier, orderId, 'READY_FOR_PICKUP')).status).toBe(409);
    expect((await assign(driver, orderId)).status).toBe(409);
  });

  it('repeated transitions are idempotent and notify/count once', async () => {
    const { orderId } = await placedOrder();
    expect((await supplierStatus(supplier, orderId, 'READY_FOR_PICKUP')).status).toBe(200);
    expect((await supplierStatus(supplier, orderId, 'READY_FOR_PICKUP')).status).toBe(200);
    expect((await assign(driver, orderId)).status).toBe(200);
    expect((await assign(driver, orderId)).status).toBe(200); // same driver retry
    expect((await assign(driver2, orderId)).status).toBe(409);
    const before = (await DeliveryPartner.findById(driver.profile._id).lean())!.totalDeliveries;
    await driverStatus(driver, orderId, 'PICKED_UP');
    const results = await Promise.all([1, 2, 3].map(() => driverStatus(driver, orderId, 'DELIVERED')));
    results.forEach((r) => expect(r.status).toBe(200));
    expect((await DeliveryPartner.findById(driver.profile._id).lean())!.totalDeliveries).toBe(before + 1);
    const order = await Order.findById(orderId).lean();
    expect(order!.statusHistory.map((h) => h.status)).toEqual(['CONFIRMED', 'READY_FOR_PICKUP', 'ASSIGNED', 'PICKED_UP', 'DELIVERED']);
  });

  it('only the owning supplier and assigned driver can update', async () => {
    const { orderId } = await placedOrder();
    expect((await supplierStatus(supplier2, orderId, 'READY_FOR_PICKUP')).status).toBe(404);
    expect((await supplierStatus(supplier2, orderId, 'CANCELLED')).status).toBe(404);
    await supplierStatus(supplier, orderId, 'READY_FOR_PICKUP');
    await assign(driver, orderId);
    expect((await driverStatus(driver2, orderId, 'PICKED_UP')).status).toBe(404);
    expect((await driverStatus(supplier, orderId, 'PICKED_UP')).status).toBe(403);
    expect((await driverStatus(buyer, orderId, 'PICKED_UP')).status).toBe(403);
    expect((await Order.findById(orderId).lean())!.status).toBe('ASSIGNED');
  });
});

// ─── COD vs delivery ────────────────────────────────────────────────────────

describe('COD payment is separate from delivery', () => {
  it('delivery leaves COD pending until the driver confirms the exact amount', async () => {
    const { orderId } = await deliveredOrder();
    const order = await Order.findById(orderId).lean();
    expect(order).toMatchObject({ status: 'DELIVERED', paymentStatus: 'PENDING' });

    expect((await cod(driver, orderId, order!.total - 1)).status).toBe(400);
    expect((await cod(driver, orderId, order!.total + 0.01)).status).toBe(400);
    expect((await Order.findById(orderId).lean())!.paymentStatus).toBe('PENDING');

    const ok = await cod(driver, orderId, order!.total);
    expect(ok.status).toBe(200);
    expect(ok.body.data).toMatchObject({ paymentStatus: 'CAPTURED', codAmountCollected: order!.total, status: 'DELIVERED' });
    expect(ok.body.data.codCollectedBy).toBe(driver.user._id.toString());

    const repeat = await cod(driver, orderId, order!.total);
    expect(repeat.status).toBe(200);
    expect(repeat.body.data.codCollectedAt).toBe(ok.body.data.codCollectedAt);
  });

  it('cash cannot be confirmed before delivery', async () => {
    const { orderId } = await placedOrder();
    await supplierStatus(supplier, orderId, 'READY_FOR_PICKUP');
    await assign(driver, orderId);
    await driverStatus(driver, orderId, 'PICKED_UP');
    const total = (await Order.findById(orderId).lean())!.total;
    expect((await cod(driver, orderId, total)).status).toBe(409);
    expect((await Order.findById(orderId).lean())!.paymentStatus).toBe('PENDING');
  });

  it('only the assigned driver can confirm cash', async () => {
    const { orderId } = await deliveredOrder();
    const total = (await Order.findById(orderId).lean())!.total;
    expect((await cod(driver2, orderId, total)).status).toBe(404);
    expect((await cod(supplier, orderId, total)).status).toBe(403);
    expect((await cod(buyer, orderId, total)).status).toBe(403);
    expect((await Order.findById(orderId).lean())!.paymentStatus).toBe('PENDING');
  });

  it('cancelled orders keep COD pending', async () => {
    const { orderId } = await placedOrder();
    await cancelAsBuyer(buyer, orderId);
    expect((await Order.findById(orderId).lean())!.paymentStatus).toBe('PENDING');
  });
});
