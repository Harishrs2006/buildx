import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import {
  seedUser, seedSupplier, seedDriver, seedProduct, newKey, SITE,
  startDb, stopDb, clearDb, makeApp,
} from './helpers';
import { Order } from '../src/infrastructure/database/models/Order.model';
import { Product } from '../src/infrastructure/database/models/Product.model';

const app = makeApp();
const api = (path: string) => `/api/v1${path}`;
type Who = { headers: Record<string, string> };

let buyer: Awaited<ReturnType<typeof seedUser>>;
let supplier: Awaited<ReturnType<typeof seedSupplier>>;
let supplier2: Awaited<ReturnType<typeof seedSupplier>>;
let driver: Awaited<ReturnType<typeof seedDriver>>;

beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => {
  await clearDb();
  buyer = await seedUser('buyer');
  supplier = await seedSupplier('supplier');
  supplier2 = await seedSupplier('supplier2');
  driver = await seedDriver('driver');
});

const supplierStatus = (who: Who, id: string, status: string) =>
  request(app).patch(api(`/suppliers/me/orders/${id}/status`)).set(who.headers).send({ status });
const supplierCod = (who: Who, id: string, amount: number) =>
  request(app).post(api(`/suppliers/me/orders/${id}/cod`)).set(who.headers).send({ amount });
const driverStatus = (who: Who, id: string, status: string) =>
  request(app).patch(api(`/delivery/orders/${id}/status`)).set(who.headers).send({ status });
const driverCod = (who: Who, id: string, amount: number) =>
  request(app).post(api(`/delivery/orders/${id}/cod`)).set(who.headers).send({ amount });
const assign = (who: Who, id: string) => request(app).post(api(`/delivery/orders/${id}/assign`)).set(who.headers);
const getOrder = (id: string) => Order.findById(id).lean();

async function placeOrder(qty = 10) {
  const product = await seedProduct(supplier.profile._id, { stockQuantity: 100 });
  const res = await request(app)
    .post(api('/orders'))
    .set(buyer.headers)
    .set('Idempotency-Key', newKey())
    .send({ items: [{ productId: product._id.toString(), quantity: qty }], deliveryAddress: SITE });
  expect(res.status).toBe(201);
  return { product, id: res.body.data.orderId as string, total: res.body.data.total as number };
}

describe('supplier self-delivery (SUPPLIER mode)', () => {
  it('runs CONFIRMED → IN_TRANSIT → DELIVERED with COD confirmed by the supplier', async () => {
    const { id, total } = await placeOrder();

    const dispatch = await supplierStatus(supplier, id, 'IN_TRANSIT');
    expect(dispatch.status).toBe(200);
    expect(dispatch.body.data).toMatchObject({ status: 'IN_TRANSIT', deliveryMode: 'SUPPLIER' });
    expect(dispatch.body.data.dispatchedAt).toBeTruthy();

    expect((await supplierStatus(supplier, id, 'DELIVERED')).status).toBe(200);
    expect(await getOrder(id)).toMatchObject({ status: 'DELIVERED', paymentStatus: 'PENDING' });

    expect((await supplierCod(supplier, id, total - 1)).status).toBe(400);
    const cod = await supplierCod(supplier, id, total);
    expect(cod.status).toBe(200);
    expect(cod.body.data).toMatchObject({ paymentStatus: 'CAPTURED', codCollectedByRole: 'SUPPLIER' });
    expect((await getOrder(id))!.statusHistory.map((h) => h.status)).toEqual(['CONFIRMED', 'IN_TRANSIT', 'DELIVERED']);
  });

  it('repeated dispatch/deliver requests are idempotent', async () => {
    const { id } = await placeOrder();
    expect((await supplierStatus(supplier, id, 'IN_TRANSIT')).status).toBe(200);
    expect((await supplierStatus(supplier, id, 'IN_TRANSIT')).status).toBe(200);
    expect((await supplierStatus(supplier, id, 'DELIVERED')).status).toBe(200);
    expect((await supplierStatus(supplier, id, 'DELIVERED')).status).toBe(200);
    expect((await getOrder(id))!.statusHistory).toHaveLength(3);
  });

  it('cash cannot be confirmed before delivery', async () => {
    const { id, total } = await placeOrder();
    await supplierStatus(supplier, id, 'IN_TRANSIT');
    expect((await supplierCod(supplier, id, total)).status).toBe(409);
  });

  it('self-delivered orders are invisible and untouchable for drivers', async () => {
    const { id, total } = await placeOrder();
    await supplierStatus(supplier, id, 'IN_TRANSIT');
    const available = await request(app).get(api('/delivery/available')).set(driver.headers);
    expect(available.body.data.map((o: any) => o._id)).not.toContain(id);
    expect((await assign(driver, id)).status).toBe(409);
    expect((await driverStatus(driver, id, 'DELIVERED')).status).toBe(404);
    await supplierStatus(supplier, id, 'DELIVERED');
    expect((await driverCod(driver, id, total)).status).toBe(404);
    expect((await getOrder(id))!.paymentStatus).toBe('PENDING');
  });

  it("another supplier can't dispatch, deliver or confirm cash", async () => {
    const { id, total } = await placeOrder();
    expect((await supplierStatus(supplier2, id, 'IN_TRANSIT')).status).toBe(404);
    await supplierStatus(supplier, id, 'IN_TRANSIT');
    expect((await supplierStatus(supplier2, id, 'DELIVERED')).status).toBe(404);
    await supplierStatus(supplier, id, 'DELIVERED');
    expect((await supplierCod(supplier2, id, total)).status).toBe(404);
  });

  it('buyer and supplier can no longer cancel once the supplier has dispatched', async () => {
    const { id, product } = await placeOrder(10);
    await supplierStatus(supplier, id, 'IN_TRANSIT');
    expect((await request(app).post(api(`/orders/${id}/cancel`)).set(buyer.headers).send({})).status).toBe(409);
    expect((await supplierStatus(supplier, id, 'CANCELLED')).status).toBe(409);
    expect((await Product.findById(product._id).lean())!.stockQuantity).toBe(90);
  });
});

describe('switching between modes', () => {
  it('supplier can take over a ready order no driver has accepted', async () => {
    const { id } = await placeOrder();
    await supplierStatus(supplier, id, 'READY_FOR_PICKUP');
    expect((await getOrder(id))!.deliveryMode).toBe('PLATFORM');

    const takeover = await supplierStatus(supplier, id, 'IN_TRANSIT');
    expect(takeover.status).toBe(200);
    expect(takeover.body.data).toMatchObject({ status: 'IN_TRANSIT', deliveryMode: 'SUPPLIER' });
    expect((await assign(driver, id)).status).toBe(409);
  });

  it("supplier can't take over once a driver is assigned", async () => {
    const { id } = await placeOrder();
    await supplierStatus(supplier, id, 'READY_FOR_PICKUP');
    expect((await assign(driver, id)).status).toBe(200);
    expect((await supplierStatus(supplier, id, 'IN_TRANSIT')).status).toBe(409);
    expect(await getOrder(id)).toMatchObject({ status: 'ASSIGNED', deliveryMode: 'PLATFORM' });
  });

  it('takeover racing a driver assignment: exactly one wins, state stays consistent', async () => {
    for (let i = 0; i < 5; i++) {
      const { id } = await placeOrder(1);
      await supplierStatus(supplier, id, 'READY_FOR_PICKUP');
      const [t, a] = await Promise.all([supplierStatus(supplier, id, 'IN_TRANSIT'), assign(driver, id)]);
      expect([t.status, a.status].sort()).toEqual([200, 409]);
      const order = await getOrder(id);
      if (order!.status === 'ASSIGNED') {
        expect(order).toMatchObject({ deliveryMode: 'PLATFORM' });
        expect(order!.driverId?.toString()).toBe(driver.user._id.toString());
      } else {
        expect(order).toMatchObject({ status: 'IN_TRANSIT', deliveryMode: 'SUPPLIER' });
        expect(order!.driverId).toBeUndefined();
      }
    }
  });

  it("supplier can't complete a BuildX driver's in-transit delivery", async () => {
    // IN_TRANSIT exists in both modes — only the delivery mode tells whose step DELIVERED is
    const { id } = await placeOrder();
    await supplierStatus(supplier, id, 'READY_FOR_PICKUP');
    await assign(driver, id);
    await driverStatus(driver, id, 'PICKED_UP');
    expect((await driverStatus(driver, id, 'IN_TRANSIT')).status).toBe(200);

    expect((await supplierStatus(supplier, id, 'DELIVERED')).status).toBe(409);
    expect((await supplierStatus(supplier, id, 'IN_TRANSIT')).status).toBe(409);
    expect(await getOrder(id)).toMatchObject({ status: 'IN_TRANSIT', deliveryMode: 'PLATFORM' });
    expect((await driverStatus(driver, id, 'DELIVERED')).status).toBe(200);
  });

  it('supplier cash confirmation is refused for driver-delivered orders', async () => {
    const { id, total } = await placeOrder();
    await supplierStatus(supplier, id, 'READY_FOR_PICKUP');
    await assign(driver, id);
    await driverStatus(driver, id, 'PICKED_UP');
    await driverStatus(driver, id, 'DELIVERED');
    expect((await supplierCod(supplier, id, total)).status).toBe(404);
    expect((await driverCod(driver, id, total)).status).toBe(200);
  });

  it('orders dispatched before delivery modes existed are treated as platform deliveries', async () => {
    const { id } = await placeOrder();
    await supplierStatus(supplier, id, 'READY_FOR_PICKUP');
    await Order.collection.updateOne({ _id: new mongoose.Types.ObjectId(id) }, { $unset: { deliveryMode: '' } });
    expect((await assign(driver, id)).status).toBe(200);
    expect((await driverStatus(driver, id, 'PICKED_UP')).status).toBe(200);
    expect((await driverStatus(driver, id, 'IN_TRANSIT')).status).toBe(200);
    expect((await supplierStatus(supplier, id, 'DELIVERED')).status).toBe(409);
    expect((await driverStatus(driver, id, 'DELIVERED')).status).toBe(200);
  });
});
