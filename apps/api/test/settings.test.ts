import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { seedUser, startDb, stopDb, clearDb, makeApp } from './helpers';
import { Category } from '../src/infrastructure/database/models/Category.model';
import { commissionPercent, commissionPaise, pickVehicle, deliveryChargePaise } from '../src/features/settings/rates';

const app = makeApp();
const api = (path: string) => `/api/v1${path}`;

describe('rates (pure)', () => {
  it('reads commission per arrangement and treats missing values as not configured', () => {
    expect(commissionPercent({ platformDeliveryPercent: 4.5, supplierDeliveryPercent: 2 }, 'PLATFORM')).toBe(4.5);
    expect(commissionPercent({ platformDeliveryPercent: 4.5, supplierDeliveryPercent: 2 }, 'SUPPLIER')).toBe(2);
    expect(commissionPercent({ platformDeliveryPercent: 4.5 }, 'SUPPLIER')).toBeNull();
    expect(commissionPercent(undefined, 'PLATFORM')).toBeNull();
    expect(commissionPercent({ platformDeliveryPercent: 0 }, 'PLATFORM')).toBe(0);
  });

  it('computes commission in paise with half-up rounding', () => {
    expect(commissionPaise(35000, 4)).toBe(1400);
    expect(commissionPaise(101, 2.5)).toBe(3);   // 2.525 → 3
    expect(commissionPaise(100, 0.25)).toBe(0);  // 0.25 → 0
    expect(commissionPaise(0, 10)).toBe(0);
  });

  const vehicles = [
    { code: 'TRUCK', name: 'Truck', maxLoadKg: 9000, baseFare: 1500, perKmRate: 40 },
    { code: 'AUTO', name: 'Auto', maxLoadKg: 500, baseFare: 200, perKmRate: 12 },
    { code: 'TEMPO', name: 'Tempo', maxLoadKg: 1500, baseFare: 500, perKmRate: 20, isActive: false },
    { code: 'MINI_TRUCK', name: 'Mini truck', maxLoadKg: 2000, baseFare: 700, perKmRate: 25 },
  ];

  it('picks the smallest active vehicle that carries the load', () => {
    expect(pickVehicle(300, vehicles)?.code).toBe('AUTO');
    expect(pickVehicle(500, vehicles)?.code).toBe('AUTO');
    expect(pickVehicle(1200, vehicles)?.code).toBe('MINI_TRUCK'); // tempo is inactive
    expect(pickVehicle(9001, vehicles)).toBeNull();
    expect(pickVehicle(-1, vehicles)).toBeNull();
  });

  it('charges base fare plus per-km rate', () => {
    expect(deliveryChargePaise({ baseFare: 200, perKmRate: 12 }, 0)).toBe(20000);
    expect(deliveryChargePaise({ baseFare: 200, perKmRate: 12 }, 7.5)).toBe(29000);
    expect(deliveryChargePaise({ baseFare: 0, perKmRate: 12.5 }, 0.1)).toBe(125);
    expect(() => deliveryChargePaise({ baseFare: 1, perKmRate: 1 }, -1)).toThrow();
  });
});

describe('ops settings API', () => {
  let buyer: Awaited<ReturnType<typeof seedUser>>;
  let operator: Awaited<ReturnType<typeof seedUser>>;
  let admin: Awaited<ReturnType<typeof seedUser>>;
  let categoryId: string;

  beforeAll(startDb);
  afterAll(stopDb);
  beforeEach(async () => {
    await clearDb();
    buyer = await seedUser('buyer');
    operator = await seedUser('operator', { role: 'OPERATOR' });
    admin = await seedUser('admin', { role: 'ADMIN' });
    categoryId = (await Category.create({ name: 'Cement', slug: 'cement' }))._id.toString();
  });

  it('admins add, rename, reorder and hide categories; the slug never changes', async () => {
    const add = (who: { headers: Record<string, string> }, body: object) => request(app).post(api('/ops/settings/categories')).set(who.headers).send(body);
    expect((await add(operator, { name: 'Sand & Aggregates' })).status).toBe(403);
    const created = await add(admin, { name: 'Sand & Aggregates', sortOrder: 3 });
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({ slug: 'sand-aggregates', isActive: true, sortOrder: 3 });
    expect((await add(admin, { name: 'sand aggregates' })).status).toBe(409);

    const id = created.body.data._id;
    const upd = await request(app).patch(api(`/ops/settings/categories/${id}`)).set(admin.headers).send({ name: 'Sand and aggregates', isActive: false });
    expect(upd.status).toBe(200);
    expect(upd.body.data).toMatchObject({ name: 'Sand and aggregates', slug: 'sand-aggregates', isActive: false });
    expect((await request(app).patch(api(`/ops/settings/categories/${id}`)).set(admin.headers).send({ slug: 'x' })).status).toBe(400);
    // A new category has no commission, so the shop leaves it out until one is set
    expect((await request(app).get(api('/ops/settings')).set(operator.headers)).body.data.categories)
      .toContainEqual(expect.objectContaining({ slug: 'sand-aggregates', platformDeliveryPercent: null, sortOrder: 3 }));
  });

  it('starts with nothing configured', async () => {
    const res = await request(app).get(api('/ops/settings')).set(operator.headers);
    expect(res.status).toBe(200);
    expect(res.body.data.categories).toEqual([
      expect.objectContaining({ slug: 'cement', platformDeliveryPercent: null, supplierDeliveryPercent: null }),
    ]);
    expect(res.body.data.vehicles).toEqual([]);
    expect(res.body.data.offerTimeoutMinutes).toBeNull();
  });

  it('blocks buyers and lets only admins change settings', async () => {
    expect((await request(app).get(api('/ops/settings')).set(buyer.headers)).status).toBe(403);
    const body = { platformDeliveryPercent: 5, supplierDeliveryPercent: 3 };
    expect((await request(app).patch(api(`/ops/settings/commission/${categoryId}`)).set(operator.headers).send(body)).status).toBe(403);
    expect((await request(app).patch(api('/ops/settings/general')).set(operator.headers).send({ offerTimeoutMinutes: 15 })).status).toBe(403);
  });

  it('sets and clears commission for a category', async () => {
    const set = await request(app).patch(api(`/ops/settings/commission/${categoryId}`)).set(admin.headers)
      .send({ platformDeliveryPercent: 5.25, supplierDeliveryPercent: 3 });
    expect(set.status).toBe(200);
    expect(set.body.data).toMatchObject({ platformDeliveryPercent: 5.25, supplierDeliveryPercent: 3 });

    const clear = await request(app).patch(api(`/ops/settings/commission/${categoryId}`)).set(admin.headers)
      .send({ platformDeliveryPercent: 5.25, supplierDeliveryPercent: null });
    expect(clear.body.data).toMatchObject({ platformDeliveryPercent: 5.25, supplierDeliveryPercent: null });

    expect((await request(app).patch(api(`/ops/settings/commission/${categoryId}`)).set(admin.headers)
      .send({ platformDeliveryPercent: 101, supplierDeliveryPercent: 1 })).status).toBe(400);
    expect((await request(app).patch(api('/ops/settings/commission/notanid')).set(admin.headers)
      .send({ platformDeliveryPercent: 1, supplierDeliveryPercent: 1 })).status).toBe(400);
  });

  it('adds and edits vehicle types, rejecting duplicates', async () => {
    const v = { code: 'mini_truck', name: 'Mini truck', maxLoadKg: 2000, baseFare: 700, perKmRate: 25 };
    const created = await request(app).post(api('/ops/settings/vehicles')).set(admin.headers).send(v);
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({ code: 'MINI_TRUCK', isActive: true });
    expect((await request(app).post(api('/ops/settings/vehicles')).set(admin.headers).send(v)).status).toBe(409);

    const edited = await request(app).patch(api(`/ops/settings/vehicles/${created.body.data._id}`)).set(admin.headers)
      .send({ perKmRate: 27.5, isActive: false });
    expect(edited.status).toBe(200);
    expect(edited.body.data).toMatchObject({ perKmRate: 27.5, isActive: false, baseFare: 700 });

    expect((await request(app).post(api('/ops/settings/vehicles')).set(admin.headers).send({ ...v, code: 'X', maxLoadKg: 0 })).status).toBe(400);
  });

  it('sets the supplier offer timeout and can switch it off', async () => {
    const on = await request(app).patch(api('/ops/settings/general')).set(admin.headers).send({ offerTimeoutMinutes: 20 });
    expect(on.body.data.offerTimeoutMinutes).toBe(20);
    const off = await request(app).patch(api('/ops/settings/general')).set(admin.headers).send({ offerTimeoutMinutes: null });
    expect(off.body.data.offerTimeoutMinutes).toBeNull();
    expect((await request(app).get(api('/ops/settings')).set(operator.headers)).body.data.offerTimeoutMinutes).toBeNull();
  });
});
