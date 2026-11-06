import { z } from 'zod';
import { ApiClientError, type ApiClient } from '@sthiva/web-core';

// Mirrors apps/api's AuthController.sendSynced / onboard response shapes.
export const syncedUserSchema = z.object({
  id: z.string(),
  // Phone OTP accounts have a phone; Google accounts have an email instead
  phone: z.string().optional(),
  email: z.string().optional(),
  name: z.string(),
  role: z.enum(['BUYER', 'SUPPLIER', 'DELIVERY_PARTNER', 'OPERATOR', 'ADMIN']),
  onboardingComplete: z.boolean(),
});
export type SyncedUser = z.infer<typeof syncedUserSchema>;

export const supplierProfileSchema = z
  .object({
    _id: z.string(),
    businessName: z.string(),
    description: z.string().optional(),
    whatsappNumber: z.string(),
    deliveryRadiusKm: z.number(),
    serviceAreas: z.array(z.string()).optional(),
    servicePincodes: z.array(z.string()).optional(),
    verificationStatus: z.enum(['PENDING', 'VERIFIED', 'REJECTED']),
    businessType: z.enum(['RETAILER', 'DEALER', 'DISTRIBUTOR', 'MANUFACTURER']).optional(),
    gstin: z.string().optional(),
    address: z.string().optional(),
    categories: z.array(z.string()).optional(),
    brands: z.array(z.string()).optional(),
    canDeliver: z.boolean().optional(),
    location: z.object({ lat: z.number(), lng: z.number() }).optional(),
    avgRating: z.number().optional(),
    totalReviews: z.number().optional(),
  })
  .passthrough();
export type SupplierProfile = z.infer<typeof supplierProfileSchema>;

// Called right after Firebase phone verification succeeds (first time or returning seller)
const WAKE_TIMEOUT_MS = 60_000;

export async function syncAuth(client: ApiClient): Promise<SyncedUser> {
  const sync = (timeoutMs?: number) =>
    client.request('/auth/sync', { method: 'POST', auth: true, envelope: true, schema: syncedUserSchema, timeoutMs });
  try {
    return await sync();
  } catch (err) {
    // The API host sleeps when idle and takes up to a minute to wake: try once more and wait longer
    const unreachable = err instanceof ApiClientError && (err.code === 'TIMEOUT' || err.code === 'NETWORK_ERROR');
    if (!unreachable) throw err;
    return sync(WAKE_TIMEOUT_MS);
  }
}

export async function onboardSupplier(
  client: ApiClient,
  input: { name: string; businessName: string; whatsappNumber: string }
): Promise<SyncedUser> {
  return client.request('/auth/onboard', {
    method: 'POST',
    auth: true,
    envelope: true,
    schema: syncedUserSchema,
    body: { ...input, role: 'SUPPLIER' },
  });
}

export async function fetchSupplierProfile(client: ApiClient): Promise<SupplierProfile> {
  return client.request('/suppliers/me', { auth: true, envelope: true, schema: supplierProfileSchema });
}
