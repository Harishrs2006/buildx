import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { seedUser, seedSupplier, seedDriver, seedOrder, startDb, stopDb, clearDb, makeApp } from './helpers';
import { Order } from '../src/infrastructure/database/models/Order.model';

const app = makeApp();
const api = (path: string) => `/api/v1${path}`;

let buyer: Awaited<ReturnType<typeof seedUser>>;
let supplier: Awaited<ReturnType<typeof seedSupplier>>;
let other: Awaited<ReturnType<typeof seedSupplier>>;
let driver: Awaited<ReturnType<typeof seedDriver>>;
let operator: Awaited<ReturnType<typeof seedUser>>;
let admin: Awaited<ReturnType<typeof seedUser>>;

// One line: supplier asks 1000, buyer pays 1100 (10% Sthiva delivers, 5% if the supplier delivers)
const line = {
  name: 'Cement', imageUrl: '', unit: 'BAG', quantity: 1, pricePerUnit: 1100, listPrice: 1100,
  gstRate: 0, isGstInclusive: true, subtotal: 1100, taxableValue: 1100, gstAmount: 0, lineTotal: 1100,
  supplierUnitPrice: 1000, supplierLineTotal: 1000, commissionPercent: 10, supplierDeliveryPercent: 5,
};

/** Sthiva driver delivered; delivery charge 200 with an 80% driver share; driver kept the cash. */
const viaDriver = () => seedOrder(buyer.user._id, supplier.profile._id, {
  items: [line], subtotal: 1100, gstAmount: 0, deliveryCharge: 200, total: 1300,
  delivery: { vehicleCode: 'AUTO', vehicleName: 'Auto', weightKg: 50, distanceKm: 4, driverSharePercent: 80 },
  status: 'DELIVERED', deliveryMode: 'PLATFORM', driverId: driver.user._id, deliveredAt: new Date(),
  paymentStatus: 'CAPTURED', codAmountCollected: 1300, codCollectedBy: driver.user._id, codCollectedByRole: 'DELIVERY_PARTNER',
});

/** Supplier delivered with their own vehicle and kept the cash. */
const ownVehicle = () => seedOrder(buyer.user._id, supplier.profile._id, {
  items: [line], subtotal: 1100, gstAmount: 0, deliveryCharge: 0, total: 1100,
  status: 'DELIVERED', deliveryMode: 'SUPPLIER', deliveredAt: new Date(),
  paymentStatus: 'CAPTURED', codAmountCollected: 1100, codCollectedBy: supplier.user._id, codCollectedByRole: 'SUPPLIER',
});

/** Delivered, but nobody has confirmed the cash yet. */
const cashUnconfirmed = () => seedOrder(buyer.user._id, supplier.profile._id, {
  items: [line], subtotal: 1100, gstAmount: 0, total: 1100, status: 'DELIVERED', deliveryMode: 'SUPPLIER', paymentStatus: 'PENDING',
});

const balances = async (party: 'SUPPLIER' | 'DRIVER') =>
  (await request(app).get(api(`/ops/settlements/balances?party=${party}`)).set(operator.headers)).body.data;
const create = (who: { headers: Record<string, string> }, party: string, partyId: unknown) =>
  request(app).post(api('/ops/settlements')).set(who.headers).send({ party, partyId: String(partyId) });

beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => {
  await clearDb();
  buyer = await seedUser('buyer');
  supplier = await seedSupplier('supplier');
  other = await seedSupplier('other');
  driver = await seedDriver('driver');
  operator = await seedUser('operator', { role: 'OPERATOR' });
  admin = await seedUser('admin', { role: 'ADMIN' });
});

describe('settlement balances', () => {
  it('nets what the supplier earned against the cash they kept; unconfirmed cash waits', async () => {
    await viaDriver();
    await ownVehicle();
    await cashUnconfirmed();
    const [b] = await balances('SUPPLIER');
    // Driver order: earns own price 1000, holds nothing. Own vehicle: 1000 + 50 (Sthiva keeps 5%), holds 1100.
    expect(b).toMatchObject({ partyId: String(supplier.profile._id), orders: 2, earned: 2050, cashHeld: 1100, net: 950, waitingForCash: 1 });
  });

  it("driver earns their share of the delivery charge and owes the cash they collected", async () => {
    await viaDriver();
    const [b] = await balances('DRIVER');
    expect(b).toMatchObject({ partyId: String(driver.user._id), orders: 1, earned: 160, cashHeld: 1300, net: -1140 });
  });
});

describe('settlement statements', () => {
  it('only an admin creates one; it takes every unsettled order once', async () => {
    const o1 = await viaDriver();
    const o2 = await ownVehicle();
    expect((await create(operator, 'SUPPLIER', supplier.profile._id)).status).toBe(403);

    const res = await create(admin, 'SUPPLIER', supplier.profile._id);
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ party: 'SUPPLIER', status: 'PENDING', earned: 2050, cashHeld: 1100, net: 950 });
    expect(res.body.data.orders).toHaveLength(2);
    for (const o of [o1, o2]) expect(String((await Order.findById(o._id).lean())!.supplierSettlementId)).toBe(res.body.data._id);

    expect((await create(admin, 'SUPPLIER', supplier.profile._id)).status).toBe(409);
    expect(await balances('SUPPLIER')).toEqual([]);
    // The driver side of the same order is still open
    expect((await create(admin, 'DRIVER', driver.user._id)).body.data).toMatchObject({ net: -1140 });
  });

  it('marks paid with a reference; a paid statement cannot be cancelled', async () => {
    await viaDriver();
    const id = (await create(admin, 'SUPPLIER', supplier.profile._id)).body.data._id;
    expect((await request(app).post(api(`/ops/settlements/${id}/paid`)).set(admin.headers).send({})).status).toBe(400);
    expect((await request(app).post(api(`/ops/settlements/${id}/paid`)).set(operator.headers).send({ reference: 'UTR123' })).status).toBe(403);
    const paid = await request(app).post(api(`/ops/settlements/${id}/paid`)).set(admin.headers).send({ reference: 'UTR123' });
    expect(paid.status).toBe(200);
    expect(paid.body.data).toMatchObject({ status: 'PAID', reference: 'UTR123' });
    expect((await request(app).post(api(`/ops/settlements/${id}/paid`)).set(admin.headers).send({ reference: 'UTR9' })).status).toBe(409);
    expect((await request(app).post(api(`/ops/settlements/${id}/cancel`)).set(admin.headers).send({ reason: 'Wrong amount' })).status).toBe(409);
  });

  it('cancelling an unpaid statement puts its orders back in the balance', async () => {
    const o = await ownVehicle();
    const id = (await create(admin, 'SUPPLIER', supplier.profile._id)).body.data._id;
    expect((await request(app).post(api(`/ops/settlements/${id}/cancel`)).set(admin.headers).send({ reason: 'Wrong amount' })).status).toBe(200);
    expect((await Order.findById(o._id).lean())!.supplierSettlementId).toBeUndefined();
    expect((await balances('SUPPLIER'))[0]).toMatchObject({ orders: 1, net: -50 });
  });

  it('suppliers and drivers see only their own balance and statements', async () => {
    await viaDriver();
    await create(admin, 'SUPPLIER', supplier.profile._id);
    const mine = (await request(app).get(api('/suppliers/me/settlements')).set(supplier.headers)).body.data;
    expect(mine.settlements).toHaveLength(1);
    expect(mine.settlements[0]).toMatchObject({ net: 1000, status: 'PENDING' });
    expect(mine.settlements[0].createdBy).toBeUndefined();
    const theirs = (await request(app).get(api('/suppliers/me/settlements')).set(other.headers)).body.data;
    expect(theirs).toMatchObject({ settlements: [], balance: { orders: 0, net: 0 } });
    const drv = (await request(app).get(api('/delivery/me/settlements')).set(driver.headers)).body.data;
    expect(drv.balance).toMatchObject({ orders: 1, net: -1140 });
    expect((await request(app).get(api('/ops/settlements')).set(supplier.headers)).status).toBe(403);
  });
});
