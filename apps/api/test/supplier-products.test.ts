import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { seedSupplier, seedProduct, startDb, stopDb, clearDb, makeApp } from './helpers';
import { Category } from '../src/infrastructure/database/models/Category.model';

const app = makeApp();

beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => {
  vi.restoreAllMocks();
  await clearDb();
});

const image = { url: 'https://res.cloudinary.com/buildx/image/upload/v1/buildx/products/abc.jpg', publicId: 'buildx/products/abc', isPrimary: true, sortOrder: 0 };

describe('supplier product images', () => {
  it('stores images supplied on create', async () => {
    const { headers } = await seedSupplier('img-sup1');
    const category = await Category.create({ name: 'Steel & TMT Bars', slug: 'steel-tmt-bars' });

    const res = await request(app).post('/api/v1/suppliers/me/products').set(headers).send({
      name: 'TMT Bar 12mm',
      categoryId: category._id.toString(),
      description: 'Fe 500 grade TMT bar, 12mm',
      unit: 'KG',
      basePrice: 62,
      images: [image],
    });

    expect(res.status).toBe(201);
    expect(res.body.data.images).toMatchObject([image]);
  });

  it('defaults to no images when none are given', async () => {
    const { headers } = await seedSupplier('img-sup2');
    const category = await Category.create({ name: 'Cement & Concrete', slug: 'cement-concrete' });

    const res = await request(app).post('/api/v1/suppliers/me/products').set(headers).send({
      name: 'OPC Cement',
      categoryId: category._id.toString(),
      description: 'OPC 53 grade cement',
      unit: 'BAG',
      basePrice: 380,
    });

    expect(res.status).toBe(201);
    expect(res.body.data.images).toEqual([]);
  });

  it('lets a supplier replace images on an existing product', async () => {
    const { headers, profile } = await seedSupplier('img-sup3');
    const product = await seedProduct(profile._id, { images: [] });

    const res = await request(app)
      .patch(`/api/v1/suppliers/me/products/${product._id}`)
      .set(headers)
      .send({ images: [image] });

    expect(res.status).toBe(200);
    expect(res.body.data.images).toMatchObject([image]);
  });

  it("does not let a supplier edit another supplier's product", async () => {
    const { profile: ownerProfile } = await seedSupplier('img-owner');
    const { headers: otherHeaders } = await seedSupplier('img-other');
    const product = await seedProduct(ownerProfile._id);

    const res = await request(app)
      .patch(`/api/v1/suppliers/me/products/${product._id}`)
      .set(otherHeaders)
      .send({ images: [image] });

    expect(res.status).toBe(404);
  });
});

describe('GET /suppliers/me/products/:id', () => {
  it("returns a supplier's own product with its category populated", async () => {
    const { headers, profile } = await seedSupplier('get-sup1');
    const product = await seedProduct(profile._id);

    const res = await request(app).get(`/api/v1/suppliers/me/products/${product._id}`).set(headers);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ _id: product._id.toString(), name: product.name });
    expect(res.body.data.categoryId).toMatchObject({ slug: 'cement-concrete' });
  });

  it("404s on another supplier's product", async () => {
    const { profile: ownerProfile } = await seedSupplier('get-owner');
    const { headers: otherHeaders } = await seedSupplier('get-other');
    const product = await seedProduct(ownerProfile._id);

    const res = await request(app).get(`/api/v1/suppliers/me/products/${product._id}`).set(otherHeaders);
    expect(res.status).toBe(404);
  });

  it('400s on a malformed ID', async () => {
    const { headers } = await seedSupplier('get-bad-id');
    const res = await request(app).get('/api/v1/suppliers/me/products/not-an-id').set(headers);
    expect(res.status).toBe(400);
  });
});

describe('product rules (create and edit)', () => {
  const base = (categoryId: string) => ({
    name: 'UltraTech OPC 53 cement',
    categoryId,
    description: 'OPC 53 grade, 50 kg bag, fresh stock',
    unit: 'BAG',
    basePrice: 380,
  });

  it('publishes with stock, shows out of stock without, and keeps drafts hidden', async () => {
    const { headers } = await seedSupplier('rule-1');
    const category = await Category.create({ name: 'Cement & Concrete', slug: 'cement-concrete' });
    const url = '/api/v1/suppliers/me/products';
    const withStock = await request(app).post(url).set(headers).send({ ...base(category.id), stockQuantity: 200 });
    const noStock = await request(app).post(url).set(headers).send(base(category.id));
    const draft = await request(app).post(url).set(headers).send({ ...base(category.id), stockQuantity: 50, status: 'DRAFT' });
    expect([withStock.body.data.status, noStock.body.data.status, draft.body.data.status]).toEqual(['ACTIVE', 'OUT_OF_STOCK', 'DRAFT']);
  });

  it('saves GST mode and sorted bulk prices', async () => {
    const { headers } = await seedSupplier('rule-2');
    const category = await Category.create({ name: 'Cement & Concrete', slug: 'cement-concrete' });
    const res = await request(app).post('/api/v1/suppliers/me/products').set(headers).send({
      ...base(category.id), gstRate: 28, isGstInclusive: false, stockQuantity: 10, lowStockAlert: 20,
      bulkPricing: [{ minQty: 500, price: 360 }, { minQty: 100, price: 370 }],
    });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ gstRate: 28, isGstInclusive: false, lowStockAlert: 20, bulkPricing: [{ minQty: 100, price: 370 }, { minQty: 500, price: 360 }] });
  });

  it.each([
    [{ gstRate: 15 }, 'gstRate'],
    [{ basePrice: 0 }, 'basePrice'],
    [{ stockQuantity: 2.5 }, 'stockQuantity'],
    [{ description: 'short' }, 'description'],
    [{ bulkPricing: [{ minQty: 100, price: 400 }] }, 'bulkPricing'],
    [{ bulkPricing: [{ minQty: 100, price: 370 }, { minQty: 500, price: 375 }] }, 'bulkPricing'],
    [{ status: 'DISCONTINUED' }, 'status'],
    [{ categoryId: 'nope' }, 'categoryId'],
    [{ verified: true }, ''],
  ])('rejects %o', async (patch, field) => {
    const { headers } = await seedSupplier(`rule-bad-${field}-${Math.random()}`);
    const category = await Category.create({ name: 'Cement & Concrete', slug: `cement-${Math.random()}`.replace('.', '') });
    const res = await request(app).post('/api/v1/suppliers/me/products').set(headers).send({ ...base(category.id), ...patch });
    expect(res.status).toBe(400);
    if (field) expect(res.body.error.details.map((d: { field: string }) => d.field)).toContain(field);
  });

  it('rejects a category that does not exist', async () => {
    const { headers } = await seedSupplier('rule-3');
    const res = await request(app).post('/api/v1/suppliers/me/products').set(headers).send(base('64b000000000000000000000'));
    expect(res.status).toBe(400);
  });

  it('checks bulk prices against the stored price on edit', async () => {
    const { headers, profile } = await seedSupplier('rule-4');
    const product = await seedProduct(profile._id, { basePrice: 380 });
    const url = `/api/v1/suppliers/me/products/${product._id}`;
    const bad = await request(app).patch(url).set(headers).send({ bulkPricing: [{ minQty: 100, price: 390 }] });
    expect(bad.status).toBe(400);
    const good = await request(app).patch(url).set(headers).send({ bulkPricing: [{ minQty: 100, price: 370 }] });
    expect(good.status).toBe(200);
    // Lowering the price under an existing tier is refused too
    const lower = await request(app).patch(url).set(headers).send({ basePrice: 360 });
    expect(lower.status).toBe(400);
  });
});

describe('GET /suppliers/me/products search and low stock', () => {
  it('finds by name and lists only products at or below their alert level', async () => {
    const { headers, profile } = await seedSupplier('find-1');
    await seedProduct(profile._id, { name: 'UltraTech OPC 53 (bag)', stockQuantity: 5, lowStockAlert: 10 });
    await seedProduct(profile._id, { name: 'TATA Tiscon 12 mm', stockQuantity: 500, lowStockAlert: 10 });
    await seedProduct(profile._id, { name: 'ACC PPC', stockQuantity: 0, lowStockAlert: 10, status: 'OUT_OF_STOCK' });
    const byName = await request(app).get('/api/v1/suppliers/me/products?q=opc 53 (').set(headers);
    expect(byName.body.data.map((p: { name: string }) => p.name)).toEqual(['UltraTech OPC 53 (bag)']);
    const low = await request(app).get('/api/v1/suppliers/me/products?lowStock=1').set(headers);
    expect(low.body.data.map((p: { name: string }) => p.name)).toEqual(['UltraTech OPC 53 (bag)']);
  });
});
