import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { seedUser, seedSupplier, seedDriver, seedOrder, startDb, stopDb, clearDb, makeApp } from './helpers';
import { periodStart, istDay } from '../src/features/analytics/analytics.service';

const app = makeApp();
const api = (path: string) => `/api/v1${path}`;

let buyer: Awaited<ReturnType<typeof seedUser>>;
let supplier: Awaited<ReturnType<typeof seedSupplier>>;
let driver: Awaited<ReturnType<typeof seedDriver>>;
let operator: Awaited<ReturnType<typeof seedUser>>;

const line = {
  name: 'Cement', imageUrl: '', unit: 'BAG', quantity: 2, pricePerUnit: 550, listPrice: 550,
  gstRate: 0, isGstInclusive: true, subtotal: 1100, taxableValue: 1100, gstAmount: 0, lineTotal: 1100,
  supplierUnitPrice: 500, supplierLineTotal: 1000, commissionPercent: 10, supplierDeliveryPercent: 5,
};

beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => {
  await clearDb();
  buyer = await seedUser('buyer');
  supplier = await seedSupplier('supplier');
  driver = await seedDriver('driver');
  operator = await seedUser('operator', { role: 'OPERATOR' });
});

describe('periods', () => {
  it('starts at IST midnight and covers whole days including today', () => {
    const now = new Date('2026-11-05T20:00:00Z'); // 6 Nov 01:30 IST
    expect(istDay(now)).toBe('2026-11-06');
    expect(periodStart(1, now).toISOString()).toBe('2026-11-05T18:30:00.000Z');
    expect(periodStart(7, now).toISOString()).toBe('2026-10-30T18:30:00.000Z');
  });
});

describe('ops analytics', () => {
  it("counts sales, everyone's earnings, Sthiva's share, cancellations and offer answers", async () => {
    const now = new Date();
    await seedOrder(buyer.user._id, supplier.profile._id, {
      items: [line], subtotal: 1100, gstAmount: 0, deliveryCharge: 200, total: 1300,
      delivery: { vehicleCode: 'AUTO', vehicleName: 'Auto', weightKg: 50, distanceKm: 4, driverSharePercent: 80 },
      status: 'DELIVERED', deliveryMode: 'PLATFORM', driverId: driver.user._id, deliveredAt: now, paymentStatus: 'CAPTURED',
      allocation: { state: 'ACCEPTED', attempts: [
        { supplierId: supplier.profile._id, offeredAt: now, outcome: 'REJECTED' },
        { supplierId: supplier.profile._id, offeredAt: now, outcome: 'ACCEPTED' },
      ] },
      driverOffer: { state: 'ASSIGNED', driverUserId: driver.user._id, attempts: [{ driverUserId: driver.user._id, offeredAt: now, outcome: 'ACCEPTED' }] },
    });
    await seedOrder(buyer.user._id, supplier.profile._id, { status: 'CANCELLED', cancelledBy: 'BUYER' });
    // Too old to count
    await seedOrder(buyer.user._id, supplier.profile._id, { status: 'DELIVERED', deliveredAt: new Date('2020-01-01'), createdAt: new Date('2020-01-01') });

    const res = await request(app).get(api('/ops/analytics?days=7')).set(operator.headers);
    expect(res.status).toBe(200);
    const d = res.body.data;
    // Buyer paid 1300; supplier earns 1000; driver 80% of 200 = 160; Sthiva keeps 100 + 40
    expect(d.totals).toMatchObject({ placed: 2, cancelled: 1, delivered: 1, sales: 1300, supplierEarnings: 1000, driverEarnings: 160, sthivaShare: 140, averageOrder: 1300 });
    expect(d.cancelledBy).toEqual({ BUYER: 1 });
    expect(d.series).toHaveLength(7);
    expect(d.series.at(-1)).toMatchObject({ date: istDay(now), placed: 2, delivered: 1, sales: 1300 });
    expect(d.topItems).toEqual([{ name: 'Cement', unit: 'BAG', quantity: 2, sales: 1100 }]);
    expect(d.suppliers[0]).toMatchObject({ offers: 2, accepted: 1, rejected: 1, acceptRate: 50, delivered: 1, sales: 1300 });
    expect(d.drivers[0]).toMatchObject({ offers: 1, accepted: 1, acceptRate: 100, delivered: 1 });
  });

  it('only allows 7, 30 or 90 days and only the ops team', async () => {
    expect((await request(app).get(api('/ops/analytics?days=12')).set(operator.headers)).status).toBe(400);
    expect((await request(app).get(api('/ops/analytics')).set(buyer.headers)).status).toBe(403);
  });
});

describe('ops people list', () => {
  it('filters by role, searches name and phone, and shows buyer order counts', async () => {
    await seedOrder(buyer.user._id, supplier.profile._id, { status: 'DELIVERED' });
    const all = await request(app).get(api('/ops/users')).set(operator.headers);
    expect(all.status).toBe(200);
    expect(all.body.meta.total).toBe(4);

    const buyers = (await request(app).get(api('/ops/users?role=BUYER')).set(operator.headers)).body.data;
    expect(buyers).toHaveLength(1);
    expect(buyers[0]).toMatchObject({ orders: 1, delivered: 1 });

    const byPhone = (await request(app).get(api(`/ops/users?q=${encodeURIComponent(buyer.user.phone!.slice(-6))}`)).set(operator.headers)).body.data;
    expect(byPhone.map((u: { _id: string }) => u._id)).toEqual([String(buyer.user._id)]);
    // Regex characters are searched literally
    expect((await request(app).get(api('/ops/users?q=.*')).set(operator.headers)).body.data).toEqual([]);
    expect((await request(app).get(api('/ops/users')).set(supplier.headers)).status).toBe(403);
  });
});
