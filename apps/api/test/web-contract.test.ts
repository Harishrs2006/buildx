import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { startDb, stopDb, clearDb, makeApp, seedSupplier, seedProduct } from './helpers';
import { env } from '../src/config/env';
import { importPostalDirectory } from '../src/features/locations/postal-import';
import { HEADER_RECENT, ROWS_RECENT, csv, chunked } from './fixtures/postal';
// The web apps' response schemas (packages/web-core). If the API's responses drift from what
// the web client validates, these tests fail.
import {
  postalLookupSchema, serviceabilitySchema, reverseLookupSchema, productListSchema,
} from '../../../packages/web-core/src/api/schemas';

const api = (path: string) => `/api/v1${path}`;
let app: ReturnType<typeof makeApp>;

beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => {
  await clearDb();
  app = makeApp();
  await importPostalDirectory({ source: chunked(csv(HEADER_RECENT, ROWS_RECENT), 100), sourceFile: 'test.csv', version: 'contract-1' });
});

// Location endpoints use the { success, data } envelope
const data = (res: request.Response) => {
  expect(res.body.success).toBe(true);
  return res.body.data;
};

describe('web-core ⇄ API response contract', () => {
  it('GET /locations/pincode/:pincode matches postalLookupSchema', async () => {
    const res = await request(app).get(api('/locations/pincode/110001'));
    expect(res.status).toBe(200);
    const parsed = postalLookupSchema.parse(data(res));
    expect(parsed.postOffices.length).toBe(2);
  });

  it('GET /locations/pincode/:pincode/serviceability matches serviceabilitySchema (both outcomes)', async () => {
    await seedSupplier('contract-supplier', { servicePincodes: ['572103'] });
    expect(serviceabilitySchema.parse(data(await request(app).get(api('/locations/pincode/572103/serviceability')))))
      .toMatchObject({ serviceable: true, supplierCount: 1 });
    expect(serviceabilitySchema.parse(data(await request(app).get(api('/locations/pincode/110001/serviceability')))))
      .toMatchObject({ serviceable: false, supplierCount: 0, reason: 'NO_SUPPLIERS' });
  });

  describe('POST /locations/reverse', () => {
    const saved = env.GOOGLE_MAPS_API_KEY;
    beforeEach(() => {
      env.GOOGLE_MAPS_API_KEY = 'contract-test-key';
      vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
        status: 'OK',
        results: [{ address_components: [
          { long_name: '572103', short_name: '572103', types: ['postal_code'] },
          { long_name: 'India', short_name: 'IN', types: ['country', 'political'] },
        ] }],
      }), { status: 200 })));
    });
    afterEach(() => { vi.unstubAllGlobals(); env.GOOGLE_MAPS_API_KEY = saved; });

    it('matches reverseLookupSchema', async () => {
      const res = await request(app).post(api('/locations/reverse')).send({ lat: 13.339, lng: 77.114 });
      expect(res.status).toBe(200);
      expect(reverseLookupSchema.parse(data(res))).toMatchObject({ pincode: '572103', postalStatus: 'VALID', requiresConfirmation: true });
    });
  });

  it('GET /products (bare JSON, no envelope) matches productListSchema with and without ?pincode', async () => {
    const supplier = await seedSupplier('contract-products', { servicePincodes: ['560001'] });
    await seedProduct(supplier.profile._id, { name: 'Contract Cement' });

    const plain = await request(app).get(api('/products'));
    expect(plain.body.success).toBeUndefined();
    expect(productListSchema.parse(plain.body).location).toBeUndefined();

    const located = productListSchema.parse((await request(app).get(api('/products?pincode=560001'))).body);
    expect(located.location).toMatchObject({ pincode: '560001', serviceable: true });
    expect(located.products).toHaveLength(1);
  });

  it('error responses carry the code the web client branches on', async () => {
    const notFound = await request(app).get(api('/locations/pincode/999999'));
    expect(notFound.body).toMatchObject({ success: false, error: { code: 'PINCODE_NOT_FOUND' } });
    const svcNotFound = await request(app).get(api('/locations/pincode/999999/serviceability'));
    expect(svcNotFound.body.error.code).toBe('PINCODE_NOT_FOUND');

    await clearDb(); // no directory → 503 with Retry-After
    const down = await request(app).get(api('/locations/pincode/572103/serviceability'));
    expect(down.status).toBe(503);
    expect(down.headers['retry-after']).toBe('30');
    expect(down.body.error.code).toBe('LOOKUP_UNAVAILABLE');
  });
});
