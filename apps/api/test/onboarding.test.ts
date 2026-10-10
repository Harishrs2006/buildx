import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { seedUser, startDb, stopDb, clearDb, makeApp } from './helpers';
import { User } from '../src/infrastructure/database/models/User.model';
import { SupplierProfile } from '../src/infrastructure/database/models/SupplierProfile.model';
import { DeliveryPartner } from '../src/infrastructure/database/models/DeliveryPartner.model';

const app = makeApp();
const ONBOARD = '/api/v1/auth/onboard';

const driverBody = {
  name: 'Manju',
  role: 'DELIVERY_PARTNER',
  vehicleType: 'TEMPO',
  vehicleNumber: ' ka06ab1234 ',
  licenseNumber: 'ka0620200001234',
};
const supplierBody = { name: 'Ramappa Gowda', role: 'SUPPLIER', businessName: 'Gowda Traders', whatsappNumber: '9876543210' };

beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => {
  vi.restoreAllMocks();
  await clearDb();
});

async function newUser(uid: string) {
  return seedUser(uid, { onboardingComplete: false, name: 'New User' });
}

// Makes the next User.findOneAndUpdate(...).lean() reject the way a dropped DB connection would
function failNextUserUpdate(message: string) {
  vi.spyOn(User, 'findOneAndUpdate').mockImplementationOnce(
    () => ({ lean: () => Promise.reject(new Error(message)) }) as any
  );
}

describe('onboarding by role', () => {
  it('onboards a buyer without creating any profile', async () => {
    const { user, headers } = await newUser('b1');
    const res = await request(app).post(ONBOARD).set(headers).send({ name: 'Rajan', role: 'BUYER' });
    expect(res.status).toBe(200);
    expect(await User.findById(user._id).lean()).toMatchObject({ role: 'BUYER', onboardingComplete: true, name: 'Rajan' });
    expect(await SupplierProfile.countDocuments()).toBe(0);
    expect(await DeliveryPartner.countDocuments()).toBe(0);
  });

  it('onboards a supplier with a PENDING profile', async () => {
    const { user, headers } = await newUser('s1');
    const res = await request(app).post(ONBOARD).set(headers).send(supplierBody);
    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe('SUPPLIER');
    const profile = await SupplierProfile.findOne({ userId: user._id }).lean();
    expect(profile).toMatchObject({ businessName: 'Gowda Traders', verificationStatus: 'PENDING', deliveryRadiusKm: 30 });
  });

  it('onboards a delivery partner and normalises vehicle details', async () => {
    const { user, headers } = await newUser('d1');
    const res = await request(app).post(ONBOARD).set(headers).send(driverBody);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ role: 'DELIVERY_PARTNER', onboardingComplete: true });
    const profile = await DeliveryPartner.findOne({ userId: user._id }).lean();
    expect(profile).toMatchObject({ vehicleType: 'TEMPO', vehicleNumber: 'KA06AB1234', licenseNumber: 'KA0620200001234' });
  });

  it.each([
    ['vehicleType', { ...driverBody, vehicleType: undefined }],
    ['vehicleNumber', { ...driverBody, vehicleNumber: undefined }],
    ['licenseNumber', { ...driverBody, licenseNumber: undefined }],
    ['vehicleType', { ...driverBody, vehicleType: 'SPACESHIP' }],
  ])('rejects a delivery partner with missing/invalid %s and changes nothing', async (field, body) => {
    const { user, headers } = await newUser(`d-bad-${field}-${String(body.vehicleType)}`);
    const res = await request(app).post(ONBOARD).set(headers).send(body);
    expect(res.status).toBe(400);
    expect(res.body.error.details.map((d: any) => d.field)).toContain(field);
    expect(await User.findById(user._id).lean()).toMatchObject({ onboardingComplete: false, role: 'BUYER' });
    expect(await DeliveryPartner.countDocuments()).toBe(0);
  });

  it('rejects a supplier without business details', async () => {
    const { headers } = await newUser('s-bad');
    const res = await request(app).post(ONBOARD).set(headers).send({ name: 'X Y', role: 'SUPPLIER' });
    expect(res.status).toBe(400);
    expect(await SupplierProfile.countDocuments()).toBe(0);
  });

  it.each(['ADMIN', 'OPERATOR', 'SUPER_ADMIN'])('never lets a client self-assign %s', async (role) => {
    const { user, headers } = await newUser(`esc-${role}`);
    const res = await request(app).post(ONBOARD).set(headers).send({ name: 'Mallory', role });
    expect(res.status).toBe(400);
    expect(await User.findById(user._id).lean()).toMatchObject({ role: 'BUYER', onboardingComplete: false });
  });

  it('refuses to onboard twice', async () => {
    const { user, headers } = await seedUser('done', { role: 'BUYER', onboardingComplete: true });
    const res = await request(app).post(ONBOARD).set(headers).send(driverBody);
    expect(res.status).toBe(409);
    expect(await User.findById(user._id).lean()).toMatchObject({ role: 'BUYER' });
    expect(await DeliveryPartner.countDocuments()).toBe(0);
  });
});

describe('retry after partial failure', () => {
  it('recovers when the user update fails after the profile was written', async () => {
    const { user, headers } = await newUser('d-crash');

    // Simulate a crash/timeout between step 1 (profile upsert) and step 2 (user flip)
    failNextUserUpdate('connection reset');
    const first = await request(app).post(ONBOARD).set(headers).send(driverBody);
    expect(first.status).toBe(500);
    expect(await User.findById(user._id).lean()).toMatchObject({ onboardingComplete: false });
    expect(await DeliveryPartner.countDocuments({ userId: user._id })).toBe(1);

    const retry = await request(app).post(ONBOARD).set(headers).send({ ...driverBody, vehicleNumber: 'KA06CD9999' });
    expect(retry.status).toBe(200);
    expect(await User.findById(user._id).lean()).toMatchObject({ role: 'DELIVERY_PARTNER', onboardingComplete: true });
    const profiles = await DeliveryPartner.find({ userId: user._id }).lean();
    expect(profiles).toHaveLength(1);
    expect(profiles[0].vehicleNumber).toBe('KA06CD9999'); // retry data wins, no duplicate
  });

  it('removes the stale profile when a retry picks a different role', async () => {
    const { user, headers } = await newUser('switcher');
    failNextUserUpdate('timeout');
    expect((await request(app).post(ONBOARD).set(headers).send(driverBody)).status).toBe(500);

    const res = await request(app).post(ONBOARD).set(headers).send(supplierBody);
    expect(res.status).toBe(200);
    expect(await DeliveryPartner.countDocuments({ userId: user._id })).toBe(0);
    expect(await SupplierProfile.countDocuments({ userId: user._id })).toBe(1);
    expect(await User.findById(user._id).lean()).toMatchObject({ role: 'SUPPLIER' });
  });

  it('handles concurrent duplicate submissions: one wins, one profile', async () => {
    const { user, headers } = await newUser('double-tap');
    const [a, b] = await Promise.all([
      request(app).post(ONBOARD).set(headers).send(driverBody),
      request(app).post(ONBOARD).set(headers).send(driverBody),
    ]);
    expect([a.status, b.status].sort()).toEqual([200, 409]);
    expect(await DeliveryPartner.countDocuments({ userId: user._id })).toBe(1);
    expect(await User.findById(user._id).lean()).toMatchObject({ role: 'DELIVERY_PARTNER', onboardingComplete: true });
  });
});
