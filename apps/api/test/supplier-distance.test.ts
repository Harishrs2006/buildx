import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { seedUser, seedSupplier, seedOrder, startDb, stopDb, clearDb, makeApp } from './helpers';
import { SupplierProfile } from '../src/infrastructure/database/models/SupplierProfile.model';

const app = makeApp();
const api = (path: string) => `/api/v1${path}`;

beforeAll(startDb);
afterAll(stopDb);
beforeEach(clearDb);

describe('supplier order distance', () => {
  it('shows straight-line km from the pickup point, or null when it is not set', async () => {
    const buyer = await seedUser('buyer');
    const supplier = await seedSupplier('supplier');
    // seedOrder delivers to 13.34, 77.1
    await seedOrder(buyer.user._id, supplier.profile._id);
    const list = async () => (await request(app).get(api('/suppliers/me/orders')).set(supplier.headers)).body.data;

    expect((await list())[0].distanceKm).toBeNull();

    await SupplierProfile.updateOne({ _id: supplier.profile._id }, { location: { lat: 13.34, lng: 77.2 } });
    const km = (await list())[0].distanceKm;
    expect(km).toBeGreaterThan(10);
    expect(km).toBeLessThan(11);
  });
});
