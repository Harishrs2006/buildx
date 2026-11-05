import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { Types } from 'mongoose';
import { seedUser, seedSupplier, seedProduct, newKey, SITE, startDb, stopDb, clearDb, makeApp } from './helpers';
import { Category } from '../src/infrastructure/database/models/Category.model';
import { CatalogItem } from '../src/infrastructure/database/models/CatalogItem.model';
import { Order } from '../src/infrastructure/database/models/Order.model';
import { SupplierProfile } from '../src/infrastructure/database/models/SupplierProfile.model';
import { VehicleType } from '../src/infrastructure/database/models/VehicleType.model';
import { PlatformSettings } from '../src/infrastructure/database/models/PlatformSettings.model';
import { DeliveryPartner } from '../src/infrastructure/database/models/DeliveryPartner.model';
import { distanceKm } from '../src/features/delivery/delivery-pricing';

const app = makeApp();
const api = (path: string) => `/api/v1${path}`;

// Delivery site (SITE) is pinned at 13.34, 77.10 (Tumakuru)
const NEAR = { lat: 13.34, lng: 77.19 };   // ~9.7 km away
const FAR = { lat: 12.97, lng: 77.59 };    // Bengaluru, ~67 km away

it('measures straight-line distance in km', () => {
  expect(distanceKm({ lat: 13.34, lng: 77.1 }, FAR)).toBeGreaterThan(60);
  expect(distanceKm({ lat: 13.34, lng: 77.1 }, FAR)).toBeLessThan(70);
  expect(distanceKm(NEAR, NEAR)).toBe(0);
});

describe('delivery pricing', () => {
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
    cat = (await Category.create({ name: 'Cement', slug: 'cement', commission: { platformDeliveryPercent: 0 } }))._id;
    item = (await CatalogItem.create({ name: 'PPC 50kg', slug: 'ppc', categoryId: cat, unit: 'BAG', weightKgPerUnit: 50, createdBy: { role: 'ADMIN' } }))._id;
  });

  const listing = (s: typeof s1, basePrice: number) =>
    seedProduct(s.profile._id, { categoryId: cat, catalogItemId: item, basePrice, gstRate: 0, isGstInclusive: false });
  const place = (productId: string, quantity: number, extra: Record<string, unknown> = {}) =>
    request(app).post(api('/orders')).set(buyer.headers).set('Idempotency-Key', newKey())
      .send({ items: [{ productId, quantity }], deliveryAddress: SITE, ...extra });
  const vehicles = () => VehicleType.create([
    { code: 'AUTO', name: 'Auto', maxLoadKg: 500, baseFare: 200, perKmRate: 10 },
    { code: 'TRUCK', name: 'Truck', maxLoadKg: 5000, baseFare: 1000, perKmRate: 30 },
  ]);

  it('is off (no charge) until an admin adds vehicle types', async () => {
    const p = await listing(s1, 400);
    const res = await place(p._id.toString(), 10);
    expect(res.status).toBe(201);
    expect(res.body.data.total).toBe(4000);
  });

  it('prices by weight, vehicle and distance, and stores how', async () => {
    await vehicles();
    await SupplierProfile.updateOne({ _id: s1.profile._id }, { location: NEAR });
    const p = await listing(s1, 400);

    const quote = await request(app).post(api('/orders/quote')).set(buyer.headers)
      .send({ items: [{ productId: p._id.toString(), quantity: 10 }], deliveryLat: SITE.lat, deliveryLng: SITE.lng });
    expect(quote.status).toBe(200);
    const km = distanceKm(NEAR, { lat: SITE.lat, lng: SITE.lng });
    // 500 kg: the auto carries exactly 500, so the smaller vehicle is chosen over the truck
    expect(quote.body.data.deliveryPricing).toMatchObject({ status: 'PRICED', weightKg: 500, vehicle: 'Auto', distanceKm: km });
    expect(quote.body.data.deliveryCharge).toBe(Math.round((200 + 10 * km) * 100) / 100);

    await PlatformSettings.create({ key: 'default', driverSharePercent: 80 });
    const res = await place(p._id.toString(), 10);
    expect(res.status).toBe(201);
    const o = (await Order.findById(res.body.data.orderId).lean())!;
    expect(o.deliveryCharge).toBe(quote.body.data.deliveryCharge);
    expect(o.total).toBe(4000 + o.deliveryCharge);
    expect(o.delivery).toMatchObject({ vehicleCode: 'AUTO', weightKg: 500, driverSharePercent: 80 });

    // Supplier keeps the whole delivery charge if they deliver; a Sthiva driver gets 80%
    const mine = await request(app).get(api('/suppliers/me/orders')).set(s1.headers);
    const e = mine.body.data[0].earnings;
    expect(e.payoutIfSthivaDelivers).toBe(4000);
    expect(e.payoutIfYouDeliver).toBe(4000 + o.deliveryCharge);
    expect(e.driverPayout).toBe(Math.round(o.deliveryCharge * 80) / 100);
  });

  it('picks the supplier with the lowest goods + delivery, not just the lowest price', async () => {
    await vehicles();
    await SupplierProfile.updateOne({ _id: s1.profile._id }, { location: FAR });
    await SupplierProfile.updateOne({ _id: s2.profile._id }, { location: NEAR });
    const cheapFar = await listing(s1, 395);
    await listing(s2, 400);
    const res = await place(cheapFar._id.toString(), 10);
    expect(res.status).toBe(201);
    expect((await Order.findById(res.body.data.orderId).lean())!.supplierId.toString()).toBe(s2.profile._id.toString());
  });

  it('refuses orders it cannot price, with the reason', async () => {
    await vehicles();
    const p = await listing(s1, 400);
    // supplier has no pickup location
    let res = await place(p._id.toString(), 2);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('DELIVERY_NOT_PRICED');

    await SupplierProfile.updateOne({ _id: s1.profile._id }, { location: NEAR });
    // too heavy for any vehicle (200 × 50 kg = 10 t)
    res = await place(p._id.toString(), 200);
    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/more than one vehicle/);

    await CatalogItem.updateOne({ _id: item }, { $unset: { weightKgPerUnit: '' } });
    res = await place(p._id.toString(), 2);
    expect(res.status).toBe(409);
  });

  it('suppliers set their pickup location; only inside India', async () => {
    expect((await request(app).patch(api('/suppliers/me')).set(s1.headers).send({ location: { lat: 13.3, lng: 77.1 } })).status).toBe(200);
    expect((await request(app).patch(api('/suppliers/me')).set(s1.headers).send({ location: { lat: 51.5, lng: -0.1 } })).status).toBe(400);
  });
});

describe('driver verification and driver share', () => {
  beforeAll(startDb);
  afterAll(stopDb);
  beforeEach(clearDb);

  it('new drivers wait for ops before getting jobs', async () => {
    const operator = await seedUser('op', { role: 'OPERATOR' });
    const admin = await seedUser('admin', { role: 'ADMIN' });
    const driver = await seedUser('d', { role: 'DELIVERY_PARTNER' });
    const profile = await DeliveryPartner.create({ userId: driver.user._id, vehicleType: 'AUTO', vehicleNumber: 'KA06AA1', licenseNumber: 'L1' });
    expect(profile.verificationStatus).toBe('PENDING');

    expect((await request(app).get(api('/delivery/available')).set(driver.headers)).status).toBe(403);
    const list = await request(app).get(api('/ops/drivers')).set(operator.headers);
    expect(list.body.data[0].verificationStatus).toBe('PENDING');

    expect((await request(app).patch(api(`/ops/drivers/${profile._id}/verification`)).set(operator.headers).send({ status: 'VERIFIED' })).status).toBe(200);
    expect((await request(app).get(api('/delivery/available')).set(driver.headers)).status).toBe(200);

    // Drivers registered before verification existed keep working
    await DeliveryPartner.collection.updateOne({ _id: profile._id }, { $unset: { verificationStatus: '' } });
    expect((await request(app).get(api('/delivery/available')).set(driver.headers)).status).toBe(200);

    const share = await request(app).patch(api('/ops/settings/general')).set(admin.headers).send({ driverSharePercent: 85 });
    expect(share.body.data).toMatchObject({ driverSharePercent: 85, offerTimeoutMinutes: null });
    expect((await request(app).patch(api('/ops/settings/general')).set(admin.headers).send({})).status).toBe(400);
  });
});
