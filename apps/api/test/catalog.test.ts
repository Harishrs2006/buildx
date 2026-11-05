import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { seedUser, seedSupplier, seedProduct, startDb, stopDb, clearDb, makeApp } from './helpers';
import { Category } from '../src/infrastructure/database/models/Category.model';
import { CatalogItem } from '../src/infrastructure/database/models/CatalogItem.model';
import { Product } from '../src/infrastructure/database/models/Product.model';
import { linkUnlinkedProducts, normaliseName } from '../src/features/catalog/catalog.service';

const app = makeApp();
const api = (path: string) => `/api/v1${path}`;

let cement: string;
let steel: string;
let s1: Awaited<ReturnType<typeof seedSupplier>>;
let s2: Awaited<ReturnType<typeof seedSupplier>>;
let operator: Awaited<ReturnType<typeof seedUser>>;
let buyer: Awaited<ReturnType<typeof seedUser>>;

const listing = (categoryId: string, extra: Record<string, unknown> = {}) => ({
  name: 'UltraTech PPC Cement 50 kg',
  categoryId,
  description: 'PPC cement, 50 kg bag, fresh stock',
  unit: 'BAG',
  basePrice: 380,
  stockQuantity: 100,
  specifications: { Brand: 'UltraTech' },
  ...extra,
});
const create = (who: { headers: Record<string, string> }, body: Record<string, unknown>) =>
  request(app).post(api('/suppliers/me/products')).set(who.headers).send(body);

beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => {
  await clearDb();
  cement = (await Category.create({ name: 'Cement', slug: 'cement' }))._id.toString();
  steel = (await Category.create({ name: 'Steel', slug: 'steel' }))._id.toString();
  s1 = await seedSupplier('s1');
  s2 = await seedSupplier('s2');
  operator = await seedUser('operator', { role: 'OPERATOR' });
  buyer = await seedUser('buyer');
});

describe('supplier listings and the Sthiva catalog', () => {
  it('normalises names for matching', () => {
    expect(normaliseName('  UltraTech  PPC-Cement, 50kg ')).toBe('ultratech ppc cement 50kg');
  });

  it('a new listing creates a catalog item for review; the same item from another supplier joins it', async () => {
    const a = await create(s1, listing(cement));
    expect(a.status).toBe(201);
    const item = await CatalogItem.findById(a.body.data.catalogItemId).lean();
    expect(item).toMatchObject({ name: 'UltraTech PPC Cement 50 kg', brand: 'UltraTech', unit: 'BAG', needsReview: true, status: 'ACTIVE' });
    expect(item!.createdBy.role).toBe('SUPPLIER');

    const b = await create(s2, listing(cement, { name: 'ultratech ppc cement, 50 KG', basePrice: 375 }));
    expect(b.status).toBe(201);
    expect(b.body.data.catalogItemId).toBe(a.body.data.catalogItemId);
    expect(await CatalogItem.countDocuments()).toBe(1);
  });

  it('different unit or category means a different item', async () => {
    await create(s1, listing(cement));
    await create(s2, listing(cement, { unit: 'TON' }));
    await create(s2, listing(steel));
    expect(await CatalogItem.countDocuments()).toBe(3);
  });

  it('picking a catalog item takes its name, category and unit, and blocks a second listing of it', async () => {
    const item = await CatalogItem.create({ name: 'JSW Fe 550D TMT 12 mm', slug: 'jsw-tmt-12', categoryId: steel, unit: 'KG', createdBy: { role: 'ADMIN' } });
    const res = await create(s1, listing(cement, { catalogItemId: item._id.toString(), name: 'my tmt', unit: 'BAG' }));
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ name: 'JSW Fe 550D TMT 12 mm', unit: 'KG', catalogItemId: item._id.toString() });
    expect(res.body.data.categoryId._id).toBe(steel);

    expect((await create(s1, listing(cement, { catalogItemId: item._id.toString() }))).status).toBe(409);
    expect((await create(s1, listing(steel, { name: 'JSW Fe 550D TMT 12 mm', unit: 'KG' }))).status).toBe(409);

    await CatalogItem.updateOne({ _id: item._id }, { status: 'INACTIVE' });
    expect((await create(s2, listing(cement, { catalogItemId: item._id.toString() }))).status).toBe(400);
  });

  it('a failed listing does not leave a stray catalog item', async () => {
    const bad = await create(s1, listing(cement, { name: 'Bad tiers item', bulkPricing: [{ minQty: 10, price: 999 }] }));
    expect(bad.status).toBe(400);
    expect(await CatalogItem.countDocuments()).toBe(0);
  });

  it('suppliers search the catalog and see what they already list', async () => {
    const a = await create(s1, listing(cement));
    await CatalogItem.create({ name: 'ACC Gold Cement 50 kg', slug: 'acc-gold', categoryId: cement, unit: 'BAG', createdBy: { role: 'ADMIN' } });

    const mine = await request(app).get(api('/suppliers/me/catalog?q=ultratech ppc')).set(s1.headers);
    expect(mine.status).toBe(200);
    expect(mine.body.data).toHaveLength(1);
    expect(mine.body.data[0].myListingId).toBe(a.body.data._id);

    const theirs = await request(app).get(api(`/suppliers/me/catalog?q=cement&categoryId=${cement}`)).set(s2.headers);
    expect(theirs.body.data.map((i: { name: string }) => i.name)).toEqual(['ACC Gold Cement 50 kg', 'UltraTech PPC Cement 50 kg']);
    expect(theirs.body.data.every((i: { myListingId: unknown }) => i.myListingId === null)).toBe(true);

    expect((await request(app).get(api('/suppliers/me/catalog')).set(buyer.headers)).status).toBe(403);
  });

  it('suppliers can say they deliver with their own vehicle', async () => {
    const res = await request(app).patch(api('/suppliers/me')).set(s1.headers).send({ canDeliver: true });
    expect(res.status).toBe(200);
    expect(res.body.data.canDeliver).toBe(true);
  });
});

describe('ops catalog management', () => {
  it('lists items needing review with listing counts, approves and edits them', async () => {
    const a = await create(s1, listing(cement));
    await create(s2, listing(cement));
    const id = a.body.data.catalogItemId;

    const queue = await request(app).get(api('/ops/catalog?review=1')).set(operator.headers);
    expect(queue.status).toBe(200);
    expect(queue.body.data).toEqual([expect.objectContaining({ _id: id, listings: 2, liveListings: 2, needsReview: true })]);

    const fixed = await request(app).patch(api(`/ops/catalog/${id}`)).set(operator.headers)
      .send({ name: 'UltraTech PPC Cement (50 kg bag)', weightKgPerUnit: 50, needsReview: false });
    expect(fixed.status).toBe(200);
    expect(fixed.body.data).toMatchObject({ weightKgPerUnit: 50, needsReview: false });
    expect((await request(app).get(api('/ops/catalog?review=1')).set(operator.headers)).body.data).toEqual([]);

    const detail = await request(app).get(api(`/ops/catalog/${id}`)).set(operator.headers);
    expect(detail.body.data.listingsDetail.map((l: { basePrice: number }) => l.basePrice)).toEqual([380, 380]);

    expect((await request(app).get(api('/ops/catalog')).set(buyer.headers)).status).toBe(403);
  });

  it('moving an item to another category moves its listings too', async () => {
    const a = await create(s1, listing(cement));
    await request(app).patch(api(`/ops/catalog/${a.body.data.catalogItemId}`)).set(operator.headers).send({ categoryId: steel });
    expect((await Product.findById(a.body.data._id).lean())!.categoryId.toString()).toBe(steel);
  });

  it('merges duplicates, refusing when a supplier lists both or units differ', async () => {
    const a = await create(s1, listing(cement, { name: 'UltraTech PPC 50kg' }));
    const b = await create(s2, listing(cement, { name: 'Ultratech Cement PPC (50 kg)' }));
    const c = await create(s2, listing(cement, { name: 'UltraTech PPC loose', unit: 'TON' }));
    const [ia, ib, ic] = [a, b, c].map((r) => r.body.data.catalogItemId);
    expect(new Set([ia, ib, ic]).size).toBe(3);

    expect((await request(app).post(api(`/ops/catalog/${ic}/merge`)).set(operator.headers).send({ intoId: ia })).status).toBe(409);

    const merged = await request(app).post(api(`/ops/catalog/${ib}/merge`)).set(operator.headers).send({ intoId: ia });
    expect(merged.status).toBe(200);
    expect(merged.body.data.moved).toBe(1);
    expect((await Product.findById(b.body.data._id).lean())!.catalogItemId!.toString()).toBe(ia);
    expect(await CatalogItem.findById(ib).lean()).toMatchObject({ status: 'INACTIVE' });

    // s1 now also lists a different item that gets merged into one s1 already lists
    const d = await create(s1, listing(cement, { name: 'UltraTech PPC bag' }));
    expect((await request(app).post(api(`/ops/catalog/${d.body.data.catalogItemId}/merge`)).set(operator.headers).send({ intoId: ia })).status).toBe(409);
  });

  it('ops can add an item directly, already reviewed', async () => {
    const res = await request(app).post(api('/ops/catalog')).set(operator.headers)
      .send({ name: 'River sand (fine)', categoryId: cement, unit: 'TON', weightKgPerUnit: 1000 });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ needsReview: false, status: 'ACTIVE' });
  });
});

describe('linking listings made before the catalog', () => {
  it('groups same-named listings into one item and is safe to run again', async () => {
    await seedProduct(s1.profile._id, { name: 'Birla Super OPC 53' });
    await seedProduct(s2.profile._id, { name: 'birla super  opc-53' });
    await seedProduct(s2.profile._id, { name: 'Sand' });
    expect(await linkUnlinkedProducts()).toBe(3);
    expect(await CatalogItem.countDocuments()).toBe(2);
    expect(await Product.countDocuments({ catalogItemId: { $exists: false } })).toBe(0);
    expect(await linkUnlinkedProducts()).toBe(0);
  });
});
