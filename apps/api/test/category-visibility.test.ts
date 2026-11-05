import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { seedUser, seedSupplier, seedProduct, newKey, SITE, startDb, stopDb, clearDb, makeApp } from './helpers';
import { Category } from '../src/infrastructure/database/models/Category.model';

const app = makeApp();
const api = (path: string) => `/api/v1${path}`;

beforeAll(startDb);
afterAll(stopDb);
beforeEach(clearDb);

describe('hidden categories', () => {
  it('leave the shop and cannot be ordered', async () => {
    const buyer = await seedUser('buyer');
    const supplier = await seedSupplier('supplier');
    const product = await seedProduct(supplier.profile._id, { stockQuantity: 10 });
    const listed = async () => (await request(app).get(api('/products'))).body.products.length;
    expect(await listed()).toBe(1);

    await Category.updateOne({ _id: product.categoryId }, { isActive: false });
    expect(await listed()).toBe(0);
    const order = await request(app).post(api('/orders')).set(buyer.headers).set('Idempotency-Key', newKey())
      .send({ items: [{ productId: product._id.toString(), quantity: 1 }], deliveryAddress: SITE });
    expect(order.status).toBeGreaterThanOrEqual(400);
  });
});
