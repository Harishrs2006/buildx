import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import {
  acceptOffer, seedUser, seedSupplier, seedDriver, seedProduct, newKey, SITE,
  startDb, stopDb, clearDb, makeApp, deliveryCode,
} from './helpers';
import { Order } from '../src/infrastructure/database/models/Order.model';
import { DeliveryPartner } from '../src/infrastructure/database/models/DeliveryPartner.model';
import { VehicleType } from '../src/infrastructure/database/models/VehicleType.model';
import { PlatformSettings } from '../src/infrastructure/database/models/PlatformSettings.model';
import { expireDriverOffers } from '../src/features/delivery/driver-offers';

const app = makeApp();
const api = (path: string) => `/api/v1${path}`;
type Who = { headers: Record<string, string> };

let buyer: Awaited<ReturnType<typeof seedUser>>;
let supplier: Awaited<ReturnType<typeof seedSupplier>>;
let operator: Awaited<ReturnType<typeof seedUser>>;
let small: Awaited<ReturnType<typeof seedDriver>>;
let big: Awaited<ReturnType<typeof seedDriver>>;

beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => {
  await clearDb();
  buyer = await seedUser('buyer');
  supplier = await seedSupplier('supplier');
  operator = await seedUser('operator', { role: 'OPERATOR' });
  small = await seedDriver('small');
  big = await seedDriver('big');
  await DeliveryPartner.updateOne({ _id: small.profile._id }, { vehicleType: 'AUTO' });
  await DeliveryPartner.updateOne({ _id: big.profile._id }, { vehicleType: 'TRUCK' });
  await VehicleType.create([
    { code: 'AUTO', name: 'Auto', maxLoadKg: 500, baseFare: 0, perKmRate: 0, isActive: false },
    { code: 'TRUCK', name: 'Truck', maxLoadKg: 5000, baseFare: 0, perKmRate: 0, isActive: false },
  ]);
});

const get = (id: string) => Order.findById(id).lean();
const available = async (who: Who) => (await request(app).get(api('/delivery/available')).set(who.headers)).body.data.map((o: { _id: string }) => o._id);
const take = (who: Who, id: string) => request(app).post(api(`/delivery/orders/${id}/assign`)).set(who.headers);
const decline = (who: Who, id: string) => request(app).post(api(`/delivery/orders/${id}/decline`)).set(who.headers).send({ reason: 'Vehicle busy' });
const driverStatus = (who: Who, id: string, status: string, otp?: string) =>
  request(app).patch(api(`/delivery/orders/${id}/status`)).set(who.headers).send({ status, ...(otp ? { otp } : {}) });

async function waitFor(check: () => Promise<boolean>) {
  for (let i = 0; i < 50; i++) { if (await check()) return; await new Promise((r) => setTimeout(r, 20)); }
  throw new Error('timed out');
}

/** A confirmed order of `kg`, made ready for a Sthiva driver; resolves once the first offer is out. */
async function readyOrder(kg?: number) {
  const product = await seedProduct(supplier.profile._id, { stockQuantity: 100 });
  const res = await request(app).post(api('/orders')).set(buyer.headers).set('Idempotency-Key', newKey())
    .send({ items: [{ productId: product._id.toString(), quantity: 1 }], deliveryAddress: SITE });
  const id = res.body.data.orderId as string;
  await acceptOffer(app, supplier, id);
  if (kg !== undefined) await Order.updateOne({ _id: id }, { delivery: { vehicleCode: 'X', vehicleName: 'X', weightKg: kg, distanceKm: 1 } });
  expect((await request(app).patch(api(`/suppliers/me/orders/${id}/status`)).set(supplier.headers).send({ status: 'READY_FOR_PICKUP' })).status).toBe(200);
  await waitFor(async () => !!(await get(id))?.driverOffer?.state);
  return id;
}

describe('driver offers', () => {
  it('offers the job to the smallest suitable vehicle; only that driver sees and takes it', async () => {
    const id = await readyOrder(300);
    expect((await get(id))!.driverOffer).toMatchObject({ state: 'OFFERED', driverUserId: small.user._id });
    expect(await available(small)).toEqual([id]);
    expect(await available(big)).toEqual([]);
    expect((await take(big, id)).status).toBe(409);
    expect((await take(small, id)).status).toBe(200);
    expect((await get(id))!.driverOffer).toMatchObject({ state: 'ASSIGNED' });
    expect((await get(id))!.driverOffer!.attempts[0].outcome).toBe('ACCEPTED');
  });

  it('skips vehicles too small for the load, then goes to ops when nobody is left', async () => {
    const id = await readyOrder(800);
    expect((await get(id))!.driverOffer!.driverUserId!.toString()).toBe(big.user._id.toString());
    expect((await decline(big, id)).status).toBe(200);
    const o = (await get(id))!;
    expect(o.driverOffer!.state).toBe('NEEDS_OPS');
    expect(o.driverOffer!.attempts.map((a) => a.outcome)).toEqual(['DECLINED']);
    const summary = await request(app).get(api('/ops/summary')).set(operator.headers);
    expect(summary.body.data.attention.noDriver.map((x: { _id: string }) => x._id)).toEqual([id]);

    // Ops assign anyone (even a smaller vehicle, their call)
    const res = await request(app).post(api(`/ops/orders/${id}/assign`)).set(operator.headers).send({ driverUserId: small.user._id.toString() });
    expect(res.status).toBe(200);
    expect((await get(id))!.driverOffer!.state).toBe('ASSIGNED');
  });

  it('declined jobs move to the next driver; off-duty and unverified drivers are skipped', async () => {
    const third = await seedDriver('third');
    await DeliveryPartner.updateOne({ _id: third.profile._id }, { verificationStatus: 'PENDING' });
    await DeliveryPartner.updateOne({ _id: big.profile._id }, { isAvailable: false });
    const id = await readyOrder(100);
    expect((await get(id))!.driverOffer!.driverUserId!.toString()).toBe(small.user._id.toString());
    await decline(small, id);
    expect((await get(id))!.driverOffer!.state).toBe('NEEDS_OPS');
    expect((await decline(small, id)).status).toBe(409);
  });

  it('moves on when the admin-set answer time runs out', async () => {
    await PlatformSettings.create({ key: 'default', driverOfferTimeoutMinutes: 5 });
    const id = await readyOrder(100);
    const exp = (await get(id))!.driverOffer!.expiresAt!;
    expect(await expireDriverOffers(new Date())).toBe(0);
    expect(await expireDriverOffers(new Date(exp.getTime() + 1000))).toBe(1);
    const o = (await get(id))!;
    expect(o.driverOffer!.driverUserId!.toString()).toBe(big.user._id.toString());
    expect(o.driverOffer!.attempts[0].outcome).toBe('EXPIRED');
  });

  it('when ops remove a driver, the job goes to someone else', async () => {
    const id = await readyOrder(100);
    await take(small, id);
    expect((await request(app).post(api(`/ops/orders/${id}/unassign`)).set(operator.headers).send({ reason: 'Not reachable' })).status).toBe(200);
    await waitFor(async () => (await get(id))!.driverOffer?.state === 'OFFERED');
    expect((await get(id))!.driverOffer!.driverUserId!.toString()).toBe(big.user._id.toString());
  });
});

describe('handover code and delivery problems', () => {
  it('the buyer sees a code; the driver needs it to mark the order delivered', async () => {
    const id = await readyOrder(100);
    await take(small, id);
    await driverStatus(small, id, 'PICKED_UP');
    const code = await deliveryCode(id);
    expect(code).toMatch(/^\d{4}$/);
    expect((await request(app).get(api(`/orders/${id}`)).set(buyer.headers)).body.data.deliveryOtp).toBe(code);

    expect((await driverStatus(small, id, 'DELIVERED')).status).toBe(400);
    const wrong = code === '1111' ? '2222' : '1111';
    const bad = await driverStatus(small, id, 'DELIVERED', wrong);
    expect(bad.status).toBe(400);
    expect(bad.body.error.message).toMatch(/4 tries left/);
    expect((await driverStatus(small, id, 'DELIVERED', code)).status).toBe(200);
    // Once delivered the buyer no longer needs (or sees) it
    expect((await request(app).get(api(`/orders/${id}`)).set(buyer.headers)).body.data.deliveryOtp).toBeUndefined();
  });

  it('locks after 5 wrong codes; ops can confirm delivery without it', async () => {
    const id = await readyOrder(100);
    await take(small, id);
    await driverStatus(small, id, 'PICKED_UP');
    const code = await deliveryCode(id);
    const wrong = code === '1111' ? '2222' : '1111';
    for (let i = 0; i < 5; i++) await driverStatus(small, id, 'DELIVERED', wrong);
    expect((await driverStatus(small, id, 'DELIVERED', code)).status).toBe(409);

    const res = await request(app).post(api(`/ops/orders/${id}/deliver`)).set(operator.headers).send({ reason: 'Buyer confirmed on the phone' });
    expect(res.status).toBe(200);
    expect((await get(id))!.status).toBe('DELIVERED');
  });

  it('suppliers delivering themselves need the code too', async () => {
    const product = await seedProduct(supplier.profile._id, { stockQuantity: 10 });
    const placed = await request(app).post(api('/orders')).set(buyer.headers).set('Idempotency-Key', newKey())
      .send({ items: [{ productId: product._id.toString(), quantity: 1 }], deliveryAddress: SITE });
    const id = placed.body.data.orderId as string;
    await acceptOffer(app, supplier, id);
    const status = (body: object) => request(app).patch(api(`/suppliers/me/orders/${id}/status`)).set(supplier.headers).send(body);
    await status({ status: 'IN_TRANSIT' });
    expect((await status({ status: 'DELIVERED' })).status).toBe(400);
    expect((await status({ status: 'DELIVERED', otp: await deliveryCode(id) })).status).toBe(200);
  });

  it('a failed delivery is reported, shows up for ops and can be resolved', async () => {
    const id = await readyOrder(100);
    await take(small, id);
    await driverStatus(small, id, 'PICKED_UP');
    const res = await request(app).post(api(`/delivery/orders/${id}/problem`)).set(small.headers).send({ reason: 'Site locked, buyer not answering' });
    expect(res.status).toBe(200);
    const q = await request(app).get(api('/ops/summary')).set(operator.headers);
    expect(q.body.data.attention.deliveryProblems.map((x: { _id: string }) => x._id)).toEqual([id]);

    expect((await request(app).post(api(`/ops/orders/${id}/resolve-problem`)).set(operator.headers).send({ reason: 'Buyer back, deliver at 5 pm' })).status).toBe(200);
    expect((await request(app).get(api('/ops/summary')).set(operator.headers)).body.data.attention.deliveryProblems).toEqual([]);
    expect((await request(app).post(api(`/delivery/orders/${id}/problem`)).set(big.headers).send({ reason: 'not mine' })).status).toBe(404);
  });
});

it('keeps older ready orders (from before offers) open to any verified driver', async () => {
  await clearDb();
  const b = await seedUser('b2');
  const s = await seedSupplier('s2');
  const d = await seedDriver('d2');
  const o = await Order.create({
    orderNumber: 'OLD-1', buyerId: b.user._id, supplierId: s.profile._id, items: [],
    deliveryAddress: { label: 'Site', fullAddress: 'x', contactPhone: '9876500000' },
    subtotal: 1, gstAmount: 0, total: 1, status: 'READY_FOR_PICKUP', deliveryMode: 'PLATFORM',
  });
  expect(await available(d)).toEqual([o._id.toString()]);
  expect((await take(d, o._id.toString())).status).toBe(200);
});
