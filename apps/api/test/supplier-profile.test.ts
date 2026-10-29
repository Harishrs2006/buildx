import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { seedSupplier, seedProduct, startDb, stopDb, clearDb, makeApp } from './helpers';
import { Product } from '../src/infrastructure/database/models/Product.model';

const app = makeApp();
const ME = '/api/v1/suppliers/me';

beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => {
  vi.restoreAllMocks();
  await clearDb();
});

describe('PATCH /suppliers/me (business setup)', () => {
  it('saves business type, GSTIN, address, categories and brands', async () => {
    const { headers } = await seedSupplier('prof-1');
    const res = await request(app).patch(ME).set(headers).send({
      businessType: 'DEALER',
      gstin: '29abcde1234f1z5',
      address: 'Survey 12, Antharasanahalli, Tumakuru',
      categories: ['cement-concrete', 'steel-tmt-bars', 'cement-concrete'],
      brands: ['UltraTech', 'TATA Tiscon', 'UltraTech'],
    });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      businessType: 'DEALER',
      gstin: '29ABCDE1234F1Z5',
      address: 'Survey 12, Antharasanahalli, Tumakuru',
      categories: ['cement-concrete', 'steel-tmt-bars'],
      brands: ['UltraTech', 'TATA Tiscon'],
    });
  });

  it('rejects an invalid GSTIN', async () => {
    const { headers } = await seedSupplier('prof-2');
    const res = await request(app).patch(ME).set(headers).send({ gstin: '29ABCDE1234' });
    expect(res.status).toBe(400);
    expect(res.body.error.details[0].field).toBe('gstin');
  });

  it('clears the GSTIN when an empty string is sent', async () => {
    const { headers } = await seedSupplier('prof-3');
    await request(app).patch(ME).set(headers).send({ gstin: '29ABCDE1234F1Z5' });
    const res = await request(app).patch(ME).set(headers).send({ gstin: '' });
    expect(res.status).toBe(200);
    expect(res.body.data.gstin).toBeUndefined();
  });

  it('rejects fields a supplier must not set', async () => {
    const { headers } = await seedSupplier('prof-4');
    const res = await request(app).patch(ME).set(headers).send({ verificationStatus: 'VERIFIED' });
    expect(res.status).toBe(400);
  });

  it('rejects an unknown business type', async () => {
    const { headers } = await seedSupplier('prof-5');
    const res = await request(app).patch(ME).set(headers).send({ businessType: 'WHOLESALER' });
    expect(res.status).toBe(400);
  });
});

describe('stock drives availability', () => {
  it('marks a product out of stock at 0 and live again when restocked', async () => {
    const { headers, profile } = await seedSupplier('stock-1');
    const product = await seedProduct(profile._id, { stockQuantity: 5 });
    const url = `${ME}/products/${product._id}`;

    let res = await request(app).patch(url).set(headers).send({ stockQuantity: 0 });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('OUT_OF_STOCK');

    res = await request(app).patch(url).set(headers).send({ stockQuantity: 40 });
    expect(res.body.data).toMatchObject({ status: 'ACTIVE', stockQuantity: 40 });
  });

  it('does not revive a draft or discontinued product when stock changes', async () => {
    const { headers, profile } = await seedSupplier('stock-2');
    const product = await seedProduct(profile._id, { status: 'DRAFT', stockQuantity: 0 });
    const res = await request(app).patch(`${ME}/products/${product._id}`).set(headers).send({ stockQuantity: 10 });
    expect(res.body.data.status).toBe('DRAFT');
  });

  it('lets an explicit status win over the stock rule', async () => {
    const { headers, profile } = await seedSupplier('stock-3');
    const product = await seedProduct(profile._id);
    const res = await request(app).patch(`${ME}/products/${product._id}`).set(headers).send({ stockQuantity: 0, status: 'DISCONTINUED' });
    expect(res.body.data.status).toBe('DISCONTINUED');
    expect((await Product.findById(product._id).lean())!.stockQuantity).toBe(0);
  });
});
