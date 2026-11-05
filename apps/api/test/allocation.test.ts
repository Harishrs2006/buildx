import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { Types } from 'mongoose';
import { seedUser, seedSupplier, seedProduct, newKey, SITE, startDb, stopDb, clearDb, makeApp } from './helpers';
import { Order } from '../src/infrastructure/database/models/Order.model';
import { Product } from '../src/infrastructure/database/models/Product.model';
import { CatalogItem } from '../src/infrastructure/database/models/CatalogItem.model';
import { PlatformSettings } from '../src/infrastructure/database/models/PlatformSettings.model';
import { expireOverdueOffers } from '../src/features/orders/allocation.service';

const app = makeApp();
const api = (path: string) => `/api/v1${path}`;
type Who = { headers: Record<string, string> };

let buyer: Awaited<ReturnType<typeof seedUser>>;
let operator: Awaited<ReturnType<typeof seedUser>>;
let a: Awaited<ReturnType<typeof seedSupplier>>;
let b: Awaited<ReturnType<typeof seedSupplier>>;
let c: Awaited<ReturnType<typeof seedSupplier>>;
let item: Types.ObjectId;
let listing: Record<string, Types.ObjectId>;

beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => {
  await clearDb();
  buyer = await seedUser('buyer');
  operator = await seedUser('operator', { role: 'OPERATOR' });
  a = await seedSupplier('a');
  b = await seedSupplier('b');
  c = await seedSupplier('c');
  const first = await seedProduct(a.profile._id, { basePrice: 400, stockQuantity: 100 });
  item = (await CatalogItem.create({ name: 'Cement', slug: 'cement-x', categoryId: first.categoryId, unit: 'BAG', createdBy: { role: 'ADMIN' } }))._id;
  await Product.updateOne({ _id: first._id }, { catalogItemId: item });
  // a and b charge the same (a listed first, so a gets the first offer); c is dearer
  const lb = await seedProduct(b.profile._id, { basePrice: 400, stockQuantity: 100, catalogItemId: item });
  const lc = await seedProduct(c.profile._id, { basePrice: 450, stockQuantity: 100, catalogItemId: item });
  listing = { a: first._id, b: lb._id, c: lc._id };
});

const stock = async (id: Types.ObjectId) => (await Product.findById(id).lean())!.stockQuantity;
const get = async (id: string) => (await Order.findById(id).lean())!;
const accept = (who: Who, id: string) => request(app).post(api(`/suppliers/me/orders/${id}/accept`)).set(who.headers);
const reject = (who: Who, id: string, reason = 'No stock today') => request(app).post(api(`/suppliers/me/orders/${id}/reject`)).set(who.headers).send({ reason });
const supplierOrders = async (who: Who) => (await request(app).get(api('/suppliers/me/orders')).set(who.headers)).body.data.map((o: { _id: string }) => o._id);

async function place(qty = 10) {
  const res = await request(app).post(api('/orders')).set(buyer.headers).set('Idempotency-Key', newKey())
    .send({ items: [{ productId: listing.a.toString(), quantity: qty }], deliveryAddress: SITE });
  expect(res.status).toBe(201);
  return res.body.data.orderId as string;
}

describe('supplier offers', () => {
  it('a new order waits for the supplier, who accepts it', async () => {
    const id = await place();
    const o = await get(id);
    expect(o).toMatchObject({ status: 'PENDING', allocation: { state: 'OFFERED' } });
    expect(o.items[0].catalogItemId!.toString()).toBe(item.toString());
    expect(o.allocation!.expiresAt).toBeUndefined(); // no answer time set
    expect(await stock(listing.a)).toBe(90);
    expect(await supplierOrders(a)).toEqual([id]);

    expect((await accept(b, id)).status).toBe(404); // never offered to b: can't see it
    const ok = await accept(a, id);
    expect(ok.status).toBe(200);
    expect(ok.body.data).toMatchObject({ status: 'CONFIRMED', allocation: { state: 'ACCEPTED' } });
    expect((await accept(a, id)).status).toBe(200); // repeat is harmless
    expect((await get(id)).allocation!.attempts).toEqual([expect.objectContaining({ outcome: 'ACCEPTED' })]);
  });

  it('a rejected order goes to the next supplier at or below the first supplier price; stock moves with it', async () => {
    const id = await place();
    expect((await reject(a, id)).status).toBe(200);
    let o = await get(id);
    expect(o.status).toBe('PENDING');
    expect(o.supplierId.toString()).toBe(b.profile._id.toString());
    expect(o.items[0].productId.toString()).toBe(listing.b.toString());
    expect(o.total).toBe(5120); // buyer price unchanged (400 × 10 + 28% GST)
    expect([await stock(listing.a), await stock(listing.b)]).toEqual([100, 90]);
    // The buyer sees one "waiting" step, not who said no or why
    const mine = await request(app).get(api(`/orders/${id}`)).set(buyer.headers);
    expect(mine.body.data.allocation).toBeUndefined();
    expect(mine.body.data.statusHistory).toEqual([expect.objectContaining({ status: 'PENDING' })]);
    expect(mine.body.data.statusHistory[0].note).toBeUndefined();
    expect(await supplierOrders(a)).toEqual([]);
    expect(await supplierOrders(b)).toEqual([id]);

    // c charges more than a did, so nobody is left automatically: ops queue, no stock held
    expect((await reject(b, id)).status).toBe(200);
    o = await get(id);
    expect(o.allocation!.state).toBe('NEEDS_OPS');
    expect(o.inventoryState).toBe('NONE');
    expect(o.allocation!.attempts.map((t) => t.outcome)).toEqual(['REJECTED', 'REJECTED']);
    expect([await stock(listing.a), await stock(listing.b), await stock(listing.c)]).toEqual([100, 100, 100]);
    expect(await supplierOrders(b)).toEqual([]);

    const summary = await request(app).get(api('/ops/summary')).set(operator.headers);
    expect(summary.body.data.attention.needsSupplier.map((x: { _id: string }) => x._id)).toEqual([id]);

    // Buyer cancels while waiting: nothing to restock
    expect((await request(app).post(api(`/orders/${id}/cancel`)).set(buyer.headers).send({})).status).toBe(200);
    expect([await stock(listing.a), await stock(listing.b), await stock(listing.c)]).toEqual([100, 100, 100]);
  });

  it('skips suppliers without enough stock and never re-offers to someone who said no', async () => {
    await Product.updateOne({ _id: listing.b }, { stockQuantity: 5 });
    await Product.updateOne({ _id: listing.c }, { basePrice: 400 });
    const id = await place();
    await reject(a, id);
    expect((await get(id)).supplierId.toString()).toBe(c.profile._id.toString());
    await reject(c, id);
    expect((await get(id)).allocation!.state).toBe('NEEDS_OPS');
  });

  it('rejecting needs a reason and only works for the supplier holding the offer', async () => {
    const id = await place();
    expect((await request(app).post(api(`/suppliers/me/orders/${id}/reject`)).set(a.headers).send({})).status).toBe(400);
    expect((await reject(b, id)).status).toBe(404);
    await accept(a, id);
    expect((await reject(a, id)).status).toBe(409);
  });

  it('cancelling a waiting order gives the stock back', async () => {
    const id = await place();
    expect((await request(app).post(api(`/orders/${id}/cancel`)).set(buyer.headers).send({})).status).toBe(200);
    expect(await stock(listing.a)).toBe(100);
  });
});

describe('answer time', () => {
  it('moves offers on when the admin-set time runs out', async () => {
    await PlatformSettings.create({ key: 'default', offerTimeoutMinutes: 10 });
    const id = await place();
    const expiresAt = (await get(id)).allocation!.expiresAt!;
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now() + 9 * 60_000);

    expect(await expireOverdueOffers(new Date())).toBe(0);
    expect(await expireOverdueOffers(new Date(expiresAt.getTime() + 1000))).toBe(1);
    const o = await get(id);
    expect(o.supplierId.toString()).toBe(b.profile._id.toString());
    expect(o.allocation!.attempts[0]).toMatchObject({ outcome: 'EXPIRED' });
    expect(o.allocation!.expiresAt!.getTime()).toBeGreaterThan(expiresAt.getTime());

    // An accepted order is never moved
    await accept(b, id);
    expect(await expireOverdueOffers(new Date(Date.now() + 60 * 60_000))).toBe(0);
    expect((await get(id)).status).toBe('CONFIRMED');
  });
});

describe('ops and waiting orders', () => {
  it('lists supplier options and offers the order to a chosen supplier (price rule not applied)', async () => {
    const id = await place();
    await reject(a, id);
    await reject(b, id);

    const options = await request(app).get(api(`/ops/orders/${id}/supplier-options`)).set(operator.headers);
    expect(options.status).toBe(200);
    expect(options.body.data).toHaveLength(3);
    expect(options.body.data.find((x: { tried: string[]; supplier: { _id: string } }) => x.supplier._id === a.profile._id.toString()).tried).toEqual(['REJECTED']);

    const offer = await request(app).post(api(`/ops/orders/${id}/offer`)).set(operator.headers)
      .send({ supplierId: c.profile._id.toString(), reason: 'Called C, they agreed' });
    expect(offer.status).toBe(200);
    const o = await get(id);
    expect(o).toMatchObject({ status: 'PENDING', allocation: { state: 'OFFERED' }, inventoryState: 'DEDUCTED' });
    expect(o.allocation!.attempts.at(-1)).toMatchObject({ byOps: true });
    expect(await stock(listing.c)).toBe(90);
    expect((await accept(c, id)).status).toBe(200);
  });

  it('can move an offer to the next supplier and refuses suppliers without the items', async () => {
    const id = await place();
    const moved = await request(app).post(api(`/ops/orders/${id}/next-supplier`)).set(operator.headers).send({ reason: 'A is closed today' });
    expect(moved.status).toBe(200);
    expect((await get(id)).supplierId.toString()).toBe(b.profile._id.toString());
    expect((await get(id)).allocation!.attempts[0]).toMatchObject({ outcome: 'WITHDRAWN' });

    const stranger = await seedSupplier('d');
    const res = await request(app).post(api(`/ops/orders/${id}/offer`)).set(operator.headers)
      .send({ supplierId: stranger.profile._id.toString(), reason: 'try d' });
    expect(res.status).toBe(409);

    await accept(b, id);
    expect((await request(app).post(api(`/ops/orders/${id}/next-supplier`)).set(operator.headers).send({ reason: 'too late' })).status).toBe(409);
    expect((await request(app).post(api(`/ops/orders/${id}/offer`)).set(buyer.headers).send({ supplierId: a.profile._id.toString(), reason: 'xxx' })).status).toBe(403);
  });
});
