import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import {
  seedUser, seedSupplier, seedDriver, seedProduct, newKey, SITE,
  startDb, stopDb, clearDb, makeApp,
} from './helpers';
import { Order } from '../src/infrastructure/database/models/Order.model';
import { Product } from '../src/infrastructure/database/models/Product.model';
import { User } from '../src/infrastructure/database/models/User.model';
import { SupplierProfile } from '../src/infrastructure/database/models/SupplierProfile.model';
import { grantRole, normalisePhone } from '../src/scripts/grant-role';

const app = makeApp();
const api = (path: string) => `/api/v1${path}`;
type Who = { headers: Record<string, string> };

let buyer: Awaited<ReturnType<typeof seedUser>>;
let supplier: Awaited<ReturnType<typeof seedSupplier>>;
let driver: Awaited<ReturnType<typeof seedDriver>>;
let driver2: Awaited<ReturnType<typeof seedDriver>>;
let operator: Awaited<ReturnType<typeof seedUser>>;
let admin: Awaited<ReturnType<typeof seedUser>>;

beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => {
  await clearDb();
  buyer = await seedUser('buyer');
  supplier = await seedSupplier('supplier');
  driver = await seedDriver('driver');
  driver2 = await seedDriver('driver2');
  operator = await seedUser('operator', { role: 'OPERATOR' });
  admin = await seedUser('admin', { role: 'ADMIN' });
});

const ops = {
  get: (who: Who, path: string) => request(app).get(api(`/ops${path}`)).set(who.headers),
  post: (who: Who, path: string, body: object = {}) => request(app).post(api(`/ops${path}`)).set(who.headers).send(body),
  patch: (who: Who, path: string, body: object = {}) => request(app).patch(api(`/ops${path}`)).set(who.headers).send(body),
};
const supplierStatus = (id: string, status: string) =>
  request(app).patch(api(`/suppliers/me/orders/${id}/status`)).set(supplier.headers).send({ status });
const driverStatus = (who: Who, id: string, status: string) =>
  request(app).patch(api(`/delivery/orders/${id}/status`)).set(who.headers).send({ status });
const assign = (who: Who, id: string) => request(app).post(api(`/delivery/orders/${id}/assign`)).set(who.headers);
const getOrder = (id: string) => Order.findById(id).select('+opsNotes').lean();
const stockOf = async (id: unknown) => (await Product.findById(id).lean())!.stockQuantity;

async function placeOrder(qty = 10) {
  const product = await seedProduct(supplier.profile._id, { stockQuantity: 100 });
  const res = await request(app)
    .post(api('/orders'))
    .set(buyer.headers)
    .set('Idempotency-Key', newKey())
    .send({ items: [{ productId: product._id.toString(), quantity: qty }], deliveryAddress: SITE });
  expect(res.status).toBe(201);
  return { product, id: res.body.data.orderId as string, total: res.body.data.total as number };
}

async function toStatus(target: 'READY_FOR_PICKUP' | 'ASSIGNED' | 'PICKED_UP' | 'DELIVERED') {
  const placed = await placeOrder();
  await supplierStatus(placed.id, 'READY_FOR_PICKUP');
  if (target === 'READY_FOR_PICKUP') return placed;
  await assign(driver, placed.id);
  if (target === 'ASSIGNED') return placed;
  await driverStatus(driver, placed.id, 'PICKED_UP');
  if (target === 'PICKED_UP') return placed;
  await driverStatus(driver, placed.id, 'DELIVERED');
  return placed;
}

describe('access control', () => {
  it('only operators and admins can use the ops API', async () => {
    expect((await request(app).get(api('/ops/summary'))).status).toBe(401);
    for (const who of [buyer, supplier, driver]) {
      expect((await ops.get(who, '/summary')).status).toBe(403);
      expect((await ops.post(who, `/orders/${new mongoose.Types.ObjectId()}/cancel`, { reason: 'test' })).status).toBe(403);
    }
    expect((await ops.get(operator, '/summary')).status).toBe(200);
    expect((await ops.get(admin, '/summary')).status).toBe(200);
  });

  it('internal ops notes never reach buyers, suppliers or drivers', async () => {
    const { id } = await toStatus('ASSIGNED');
    expect((await ops.post(operator, `/orders/${id}/notes`, { note: 'Buyer called, wants morning slot' })).status).toBe(201);

    const views = [
      await request(app).get(api(`/orders/${id}`)).set(buyer.headers),
      await request(app).get(api('/orders')).set(buyer.headers),
      await request(app).get(api('/suppliers/me/orders')).set(supplier.headers),
      await request(app).get(api('/delivery/my-orders')).set(driver.headers),
    ];
    for (const v of views) {
      expect(v.status).toBe(200);
      expect(JSON.stringify(v.body)).not.toContain('morning slot');
    }
    const detail = await ops.get(operator, `/orders/${id}`);
    expect(detail.body.data.opsNotes.map((n: any) => n.note)).toContain('Buyer called, wants morning slot');
  });
});

describe('attention queue and order search', () => {
  it('surfaces stuck orders and pending cash', async () => {
    const ready = await toStatus('READY_FOR_PICKUP');
    const fresh = await toStatus('READY_FOR_PICKUP');
    const delivered = await toStatus('DELIVERED');
    // Age the first ready order past the 30-minute threshold
    await Order.collection.updateOne(
      { _id: new mongoose.Types.ObjectId(ready.id) },
      { $set: { updatedAt: new Date(Date.now() - 45 * 60_000) } }
    );

    const res = await ops.get(operator, '/summary');
    expect(res.status).toBe(200);
    const ids = (k: string) => res.body.data.attention[k].map((o: any) => o._id);
    expect(ids('unassigned')).toContain(ready.id);
    expect(ids('unassigned')).not.toContain(fresh.id);
    expect(ids('codPending')).toContain(delivered.id);
    expect(res.body.data.counts).toMatchObject({ READY_FOR_PICKUP: 2, DELIVERED: 1 });
  });

  it('filters by status and order-number prefix, and validates input', async () => {
    const { id } = await toStatus('READY_FOR_PICKUP');
    await placeOrder();
    const order = await getOrder(id);

    const byStatus = await ops.get(operator, '/orders?status=READY_FOR_PICKUP');
    expect(byStatus.body.data.map((o: any) => o._id)).toEqual([id]);

    const prefix = order!.orderNumber.slice(0, order!.orderNumber.length - 2).toLowerCase();
    const byNumber = await ops.get(operator, `/orders?q=${prefix}`);
    expect(byNumber.body.data.map((o: any) => o._id)).toContain(id);

    expect((await ops.get(operator, '/orders?status=NOPE')).status).toBe(400);
    expect((await ops.get(operator, '/orders?q=.*')).status).toBe(400);
    expect((await ops.get(operator, '/orders?status[$ne]=X')).status).toBe(400);
  });
});

describe('ops cancellation', () => {
  it('before pickup: restores stock once and records the reason', async () => {
    const { id, product } = await toStatus('ASSIGNED');
    expect(await stockOf(product._id)).toBe(90);
    const res = await ops.post(operator, `/orders/${id}/cancel`, { reason: 'Supplier truck broke down' });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ status: 'CANCELLED', cancelledBy: 'OPS', inventoryState: 'RESTORED' });
    expect(await stockOf(product._id)).toBe(100);
    expect((await ops.post(operator, `/orders/${id}/cancel`, { reason: 'again' })).status).toBe(200);
    expect(await stockOf(product._id)).toBe(100);
    const order = await getOrder(id);
    expect(order!.statusHistory.at(-1)).toMatchObject({ status: 'CANCELLED', byRole: 'OPERATOR' });
    expect(order!.opsNotes.some((n) => n.note.includes('Supplier truck broke down'))).toBe(true);
  });

  it('after pickup: requires an explicit restock decision', async () => {
    const lost = await toStatus('PICKED_UP');
    expect((await ops.post(operator, `/orders/${lost.id}/cancel`, { reason: 'Buyer refused' })).status).toBe(400);
    expect((await getOrder(lost.id))!.status).toBe('PICKED_UP');

    const res = await ops.post(operator, `/orders/${lost.id}/cancel`, { reason: 'Material damaged in transit', restock: false });
    expect(res.status).toBe(200);
    expect(res.body.data.inventoryState).toBe('NOT_RESTORED');
    expect(await stockOf(lost.product._id)).toBe(90);

    const returned = await toStatus('PICKED_UP');
    await ops.post(operator, `/orders/${returned.id}/cancel`, { reason: 'Buyer refused, goods returned', restock: true });
    expect(await stockOf(returned.product._id)).toBe(100);
  });

  it('requires a reason and cannot cancel delivered orders', async () => {
    const { id } = await toStatus('DELIVERED');
    expect((await ops.post(operator, `/orders/${id}/cancel`, {})).status).toBe(400);
    expect((await ops.post(operator, `/orders/${id}/cancel`, { reason: 'too late', restock: true })).status).toBe(409);
  });
});

describe('driver assignment by ops', () => {
  it('unassigns a no-show driver and puts the order back in the pool', async () => {
    const { id } = await toStatus('ASSIGNED');
    const res = await ops.post(operator, `/orders/${id}/unassign`, { reason: 'Driver not reachable' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('READY_FOR_PICKUP');
    expect(res.body.data.driverId).toBeUndefined();

    expect((await driverStatus(driver, id, 'PICKED_UP')).status).toBe(404);
    const pool = await request(app).get(api('/delivery/available')).set(driver2.headers);
    expect(pool.body.data.map((o: any) => o._id)).toContain(id);
    expect((await ops.post(operator, `/orders/${id}/unassign`, { reason: 'retry' })).status).toBe(200);
  });

  it("can't unassign once the goods are picked up", async () => {
    const { id } = await toStatus('PICKED_UP');
    expect((await ops.post(operator, `/orders/${id}/unassign`, { reason: 'late' })).status).toBe(409);
  });

  it('assigns a specific driver who can then deliver', async () => {
    const { id } = await toStatus('READY_FOR_PICKUP');
    const res = await ops.post(operator, `/orders/${id}/assign`, { driverUserId: driver2.user._id.toString() });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ status: 'ASSIGNED', deliveryMode: 'PLATFORM' });
    expect((await ops.post(operator, `/orders/${id}/assign`, { driverUserId: driver2.user._id.toString() })).status).toBe(200);
    expect((await ops.post(operator, `/orders/${id}/assign`, { driverUserId: driver.user._id.toString() })).status).toBe(409);
    expect((await driverStatus(driver2, id, 'PICKED_UP')).status).toBe(200);
  });

  it('only assigns active, onboarded delivery partners to existing orders', async () => {
    const { id } = await toStatus('READY_FOR_PICKUP');
    expect((await ops.post(operator, `/orders/${id}/assign`, { driverUserId: buyer.user._id.toString() })).status).toBe(400);
    const noProfile = await seedUser('dp-no-profile', { role: 'DELIVERY_PARTNER' });
    expect((await ops.post(operator, `/orders/${id}/assign`, { driverUserId: noProfile.user._id.toString() })).status).toBe(400);
    await User.updateOne({ _id: driver2.user._id }, { isActive: false });
    expect((await ops.post(operator, `/orders/${id}/assign`, { driverUserId: driver2.user._id.toString() })).status).toBe(400);
    const missing = new mongoose.Types.ObjectId().toString();
    expect((await ops.post(operator, `/orders/${missing}/assign`, { driverUserId: driver.user._id.toString() })).status).toBe(404);
    expect((await getOrder(id))!.status).toBe('READY_FOR_PICKUP');
  });

  it('lists drivers with their active load', async () => {
    await toStatus('ASSIGNED');
    const res = await ops.get(operator, '/drivers');
    const d1 = res.body.data.find((d: any) => d.userId._id === driver.user._id.toString());
    const d2 = res.body.data.find((d: any) => d.userId._id === driver2.user._id.toString());
    expect(d1.activeOrders).toBe(1);
    expect(d2.activeOrders).toBe(0);
  });
});

describe('COD exceptions', () => {
  it('records a short payment as PARTIAL, then the balance as CAPTURED', async () => {
    const { id, total } = await toStatus('DELIVERED');
    const short = await ops.post(operator, `/orders/${id}/cod`, { amount: total - 100, note: 'Buyer paid short, balance tomorrow' });
    expect(short.status).toBe(200);
    expect(short.body.data).toMatchObject({ paymentStatus: 'PARTIAL', codAmountCollected: total - 100, codCollectedByRole: 'OPERATOR' });

    // Driver can no longer self-confirm once support is handling it
    const driverTry = await request(app).post(api(`/delivery/orders/${id}/cod`)).set(driver.headers).send({ amount: total });
    expect(driverTry.status).toBe(409);

    const full = await ops.post(operator, `/orders/${id}/cod`, { amount: total, note: 'Balance received' });
    expect(full.body.data).toMatchObject({ paymentStatus: 'CAPTURED', codAmountCollected: total });
    expect((await ops.post(operator, `/orders/${id}/cod`, { amount: total - 1, note: 'oops' })).status).toBe(409);
  });

  it('validates amount, note and delivery state', async () => {
    const delivered = await toStatus('DELIVERED');
    expect((await ops.post(operator, `/orders/${delivered.id}/cod`, { amount: delivered.total + 1, note: 'too much' })).status).toBe(400);
    expect((await ops.post(operator, `/orders/${delivered.id}/cod`, { amount: delivered.total })).status).toBe(400);
    const inTransit = await toStatus('PICKED_UP');
    expect((await ops.post(operator, `/orders/${inTransit.id}/cod`, { amount: inTransit.total, note: 'early' })).status).toBe(409);
  });
});

describe('suppliers and accounts', () => {
  it('verifies or rejects suppliers', async () => {
    const pending = await ops.get(operator, '/suppliers?verification=PENDING');
    expect(pending.body.data.map((s: any) => s._id)).toContain(supplier.profile._id.toString());

    const res = await ops.patch(operator, `/suppliers/${supplier.profile._id}/verification`, { status: 'VERIFIED' });
    expect(res.status).toBe(200);
    expect((await SupplierProfile.findById(supplier.profile._id).lean())!.verificationStatus).toBe('VERIFIED');
    expect((await ops.patch(operator, `/suppliers/${supplier.profile._id}/verification`, { status: 'PENDING' })).status).toBe(400);
  });

  it('only admins can suspend accounts, never themselves or other admins', async () => {
    const target = `/users/${supplier.user._id}/active`;
    expect((await ops.patch(operator, target, { isActive: false, reason: 'fraud' })).status).toBe(403);

    expect((await ops.patch(admin, target, { isActive: false, reason: 'Fake listings' })).status).toBe(200);
    expect((await request(app).get(api('/suppliers/me')).set(supplier.headers)).status).toBe(403);
    expect((await ops.patch(admin, target, { isActive: true, reason: 'Resolved' })).status).toBe(200);
    expect((await request(app).get(api('/suppliers/me')).set(supplier.headers)).status).toBe(200);

    expect((await ops.patch(admin, `/users/${admin.user._id}/active`, { isActive: false, reason: 'self' })).status).toBe(403);
    const admin2 = await seedUser('admin2', { role: 'ADMIN' });
    expect((await ops.patch(admin, `/users/${admin2.user._id}/active`, { isActive: false, reason: 'x y z' })).status).toBe(404);
  });
});

describe('grant-role script', () => {
  it('normalises Indian phone numbers', () => {
    expect(normalisePhone('98765 43210')).toBe('+919876543210');
    expect(normalisePhone('+919876543210')).toBe('+919876543210');
    expect(() => normalisePhone('12345')).toThrow();
  });

  it('promotes an existing user, who then gets ops access', async () => {
    const person = await seedUser('future-ops', { onboardingComplete: false });
    expect((await ops.get(person, '/summary')).status).toBe(403);
    const updated = await grantRole(person.user.phone, 'OPERATOR');
    expect(updated).toMatchObject({ role: 'OPERATOR' });
    expect((await User.findById(person.user._id).lean())!.onboardingComplete).toBe(true);
    expect((await ops.get(person, '/summary')).status).toBe(200);
  });

  it('refuses unknown users and roles that must onboard in the app', async () => {
    await expect(grantRole('9000000001', 'OPERATOR')).rejects.toThrow(/sign in/);
    const person = await seedUser('wannabe');
    await expect(grantRole(person.user.phone, 'SUPPLIER')).rejects.toThrow(/Role must be/);
  });
});
