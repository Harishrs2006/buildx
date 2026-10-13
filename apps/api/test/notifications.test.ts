import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { seedSupplier, seedUser, seedOrder, startDb, stopDb, clearDb, makeApp } from './helpers';
import { User } from '../src/infrastructure/database/models/User.model';
import { DeliveryPartner } from '../src/infrastructure/database/models/DeliveryPartner.model';
import { logger } from '../src/shared/logger/logger';
import { notifyUser, notifyUsers } from '../src/shared/services/notification.service';

// Regression: notification lookups are fire-and-forget. A failing lookup used to reject with
// nothing attached, and server.ts shuts the process down on unhandledRejection.

const app = makeApp();
const api = (path: string) => `/api/v1${path}`;
const payload = { title: 'Test', body: 'Test body' };

// Mongoose query chain (.select().lean()) that rejects like a dropped connection
const failingQuery = (message: string) =>
  (() => ({ select: () => ({ lean: () => Promise.reject(new Error(message)) }) })) as never;

const flush = () => new Promise((resolve) => setTimeout(resolve, 50));

let unhandled: unknown[];
const onUnhandled = (reason: unknown) => unhandled.push(reason);

beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => {
  await clearDb();
  unhandled = [];
  process.on('unhandledRejection', onUnhandled);
});
afterEach(() => {
  process.off('unhandledRejection', onUnhandled);
  vi.restoreAllMocks();
});

describe('notification service', () => {
  it('notifyUser resolves and logs the error when the user lookup fails', async () => {
    vi.spyOn(User, 'findById').mockImplementation(failingQuery('client was closed'));
    const error = vi.spyOn(logger, 'error').mockImplementation(() => logger);

    await expect(notifyUser('64b000000000000000000001', payload)).resolves.toBeUndefined();
    expect(error).toHaveBeenCalledWith('Notification failed', expect.objectContaining({
      userId: '64b000000000000000000001', error: 'client was closed',
    }));
  });

  it('notifyUsers resolves and logs the error when the user lookup fails', async () => {
    vi.spyOn(User, 'find').mockImplementation(failingQuery('client was closed'));
    const error = vi.spyOn(logger, 'error').mockImplementation(() => logger);

    await expect(notifyUsers(['64b000000000000000000001'], payload)).resolves.toBeUndefined();
    expect(error).toHaveBeenCalledWith('Notification failed', expect.objectContaining({
      userCount: 1, error: 'client was closed',
    }));
  });
});

describe('fire-and-forget notifications in request handlers', () => {
  it('a failing driver lookup is logged and does not cause an unhandled rejection', async () => {
    const buyer = await seedUser('buyer');
    const supplier = await seedSupplier('supplier');
    const order = await seedOrder(buyer.user._id, supplier.profile._id);
    vi.spyOn(DeliveryPartner, 'find').mockImplementation(failingQuery('driver lookup failed'));
    const error = vi.spyOn(logger, 'error').mockImplementation(() => logger);

    const res = await request(app).patch(api(`/suppliers/me/orders/${order._id}/status`))
      .set(supplier.headers).send({ status: 'READY_FOR_PICKUP' });
    await flush();

    expect(res.status).toBe(200);
    expect(unhandled).toEqual([]);
    expect(error).toHaveBeenCalledWith('Driver notification lookup failed', expect.objectContaining({
      orderId: order._id.toString(), error: 'driver lookup failed',
    }));
  });

  it('a failing buyer lookup is logged and does not cause an unhandled rejection', async () => {
    const buyer = await seedUser('buyer');
    const supplier = await seedSupplier('supplier');
    const order = await seedOrder(buyer.user._id, supplier.profile._id);
    vi.spyOn(User, 'findById').mockImplementation(failingQuery('buyer lookup failed'));
    const error = vi.spyOn(logger, 'error').mockImplementation(() => logger);

    const res = await request(app).patch(api(`/suppliers/me/orders/${order._id}/status`))
      .set(supplier.headers).send({ status: 'CANCELLED' });
    await flush();

    expect(res.status).toBe(200);
    expect(unhandled).toEqual([]);
    expect(error).toHaveBeenCalledWith('Notification failed', expect.objectContaining({
      userId: buyer.user._id.toString(), error: 'buyer lookup failed',
    }));
  });
});
