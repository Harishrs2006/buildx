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
