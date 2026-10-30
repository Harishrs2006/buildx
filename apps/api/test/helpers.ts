import { vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server-core';
import type { Application } from 'express';
import { createApp } from '../src/app';
import { registerRoutes } from '../src/routes';
import { User } from '../src/infrastructure/database/models/User.model';
import { SupplierProfile } from '../src/infrastructure/database/models/SupplierProfile.model';
import { DeliveryPartner } from '../src/infrastructure/database/models/DeliveryPartner.model';
import { Order } from '../src/infrastructure/database/models/Order.model';
import { Product } from '../src/infrastructure/database/models/Product.model';
import { Category } from '../src/infrastructure/database/models/Category.model';
import type { UserRole } from '@buildx/shared';

// ─── Firebase token fake ────────────────────────────────────────────────────
// Tokens are plain strings the mock understands:
//   valid|<uid>|<phone>   → decodes to { uid, phone_number }
//   valid|<uid>|          → decodes without a phone number
//   google|<uid>|<email>|<name>            → verified Google sign-in (seller website)
//   google-unverified|<uid>|<email>        → Google sign-in whose email is not verified
//   password|<uid>|<email>                 → email/password sign-in (not a BuildX identity)
//   expired | revoked | disabled | garbage → throw the matching Firebase auth error
//   network               → throws a non-auth error (e.g. cert fetch failure)

const mocks = vi.hoisted(() => {
  const authError = (code: string) => Object.assign(new Error(code), { code });
  const verifyIdToken = vi.fn(async (token: string, _checkRevoked?: boolean) => {
    switch (token) {
      case 'expired': throw authError('auth/id-token-expired');
      case 'revoked': throw authError('auth/id-token-revoked');
      case 'disabled': throw authError('auth/user-disabled');
      case 'garbage': throw authError('auth/argument-error');
      case 'network': throw new Error('getaddrinfo ENOTFOUND www.googleapis.com');
    }
    if (token.startsWith('google|') || token.startsWith('google-unverified|')) {
      const [kind, uid, email, name] = token.split('|');
      return { uid, email, name, email_verified: kind === 'google', firebase: { sign_in_provider: 'google.com' } };
    }
    if (token.startsWith('password|')) {
      const [, uid, email] = token.split('|');
      return { uid, email, email_verified: true, firebase: { sign_in_provider: 'password' } };
    }
    const [kind, uid, phone] = token.split('|');
    if (kind !== 'valid' || !uid) throw authError('auth/argument-error');
    return { uid, ...(phone ? { phone_number: phone } : {}) };
  });
  const anthropicCreate = vi.fn(async (_params: unknown) => ({
    content: [{ type: 'text', text: 'Namaskara! How can I help?' }],
  }));
  return { verifyIdToken, anthropicCreate };
});

export const { verifyIdToken, anthropicCreate } = mocks;

vi.mock('firebase-admin/auth', () => ({ getAuth: () => ({ verifyIdToken: mocks.verifyIdToken }) }));
vi.mock('firebase-admin/messaging', () => ({
  getMessaging: () => ({
    send: vi.fn().mockResolvedValue('msg-id'),
    sendEachForMulticast: vi.fn().mockResolvedValue({ successCount: 0, failureCount: 0, responses: [] }),
  }),
}));

vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = { create: mocks.anthropicCreate };
  },
}));

export function bearer(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export function tokenFor(uid: string, phone = phoneFor(uid)) {
  return `valid|${uid}|${phone}`;
}

let phoneSeq = 0;
function phoneFor(_uid: string) {
  phoneSeq += 1;
  return `+9198${String(phoneSeq).padStart(8, '0')}`;
}

// ─── App + DB ───────────────────────────────────────────────────────────────

// Single-node replica set: order creation/cancellation use MongoDB transactions (as on Atlas)
let mongod: MongoMemoryReplSet | undefined;

export async function startDb() {
  mongod = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  await mongoose.connect(mongod.getUri(), { dbName: 'buildx-test' });
  // Unique indexes (firebaseUid, phone, profile userId, idempotency key) are part of what's under test
  await Promise.all([User.init(), SupplierProfile.init(), DeliveryPartner.init(), Order.init(), Product.init(), Category.init()]);
}

export async function stopDb() {
  await mongoose.disconnect();
  await mongod?.stop();
}

export async function clearDb() {
  const collections = await mongoose.connection.db!.collections();
  await Promise.all(collections.map((c) => c.deleteMany({})));
}

export function makeApp(): Application {
  const app = createApp();
  registerRoutes(app);
  return app;
}

// ─── Fixtures ───────────────────────────────────────────────────────────────

type SeedUserOpts = { role?: UserRole; onboardingComplete?: boolean; isActive?: boolean; name?: string };

export async function seedUser(uid: string, opts: SeedUserOpts = {}) {
  const phone = phoneFor(uid);
  const user = await User.create({
    firebaseUid: uid,
    phone,
    name: opts.name ?? uid,
    role: opts.role ?? 'BUYER',
    onboardingComplete: opts.onboardingComplete ?? true,
    isActive: opts.isActive ?? true,
  });
  return { user, token: tokenFor(uid, phone), headers: bearer(tokenFor(uid, phone)) };
}

// Defaults to a VERIFIED supplier (an approved seller); pass verificationStatus to test others
export async function seedSupplier(
  uid: string,
  opts: { verificationStatus?: 'PENDING' | 'VERIFIED' | 'REJECTED'; servicePincodes?: string[] } = {}
) {
  const seeded = await seedUser(uid, { role: 'SUPPLIER' });
  const profile = await SupplierProfile.create({
    userId: seeded.user._id,
    businessName: `${uid} Traders`,
    whatsappNumber: '9876543210',
    verificationStatus: opts.verificationStatus ?? 'VERIFIED',
    servicePincodes: opts.servicePincodes ?? [],
  });
  return { ...seeded, profile };
}

export async function seedDriver(uid: string) {
  const seeded = await seedUser(uid, { role: 'DELIVERY_PARTNER' });
  const profile = await DeliveryPartner.create({
    userId: seeded.user._id,
    vehicleType: 'TEMPO',
    vehicleNumber: 'KA06AB1234',
    licenseNumber: 'KA0620200001234',
  });
  return { ...seeded, profile };
}

let orderSeq = 0;
export async function seedOrder(buyerId: mongoose.Types.ObjectId, supplierProfileId: mongoose.Types.ObjectId, extra: Record<string, unknown> = {}) {
  orderSeq += 1;
  return Order.create({
    orderNumber: `BX-TEST-${orderSeq}`,
    buyerId,
    supplierId: supplierProfileId,
    items: [],
    deliveryAddress: { label: 'Site', fullAddress: 'Plot 12, SIT Road, Tumakuru', lat: 13.34, lng: 77.1, contactPhone: '9876500000' },
    subtotal: 1000,
    gstAmount: 180,
    total: 1180,
    paymentMethod: 'COD',
    status: 'CONFIRMED',
    ...extra,
  });
}

let productSeq = 0;
export async function seedProduct(supplierProfileId: mongoose.Types.ObjectId, extra: Record<string, unknown> = {}) {
  productSeq += 1;
  const category = await Category.findOneAndUpdate(
    { slug: 'cement-concrete' },
    { $setOnInsert: { name: 'Cement & Concrete', slug: 'cement-concrete' } },
    { upsert: true, new: true }
  );
  return Product.create({
    supplierId: supplierProfileId,
    categoryId: category._id,
    name: `Test Product ${productSeq}`,
    slug: `test-product-${productSeq}`,
    description: 'Test product',
    unit: 'BAG',
    basePrice: 400,
    gstRate: 28,
    isGstInclusive: false,
    stockQuantity: 100,
    minOrderQuantity: 1,
    status: 'ACTIVE',
    ...extra,
  });
}

let keySeq = 0;
/** A fresh, valid Idempotency-Key */
export function newKey() {
  keySeq += 1;
  return `test-key-${Date.now()}-${keySeq}-abcdef`;
}

export const SITE = {
  label: 'Site',
  fullAddress: 'Plot 12, SIT Road, Tumakuru 572103',
  lat: 13.34,
  lng: 77.1,
  contactPhone: '+919876500000',
};
