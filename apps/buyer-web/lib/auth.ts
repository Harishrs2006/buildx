import { z } from 'zod';
import type { ApiClient } from '@buildx/web-core';

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

// Called right after Firebase sign-in succeeds (phone code or Google) (first time or returning buyer)
export async function syncAuth(client: ApiClient): Promise<SyncedUser> {
  return client.request('/auth/sync', { method: 'POST', auth: true, envelope: true, schema: syncedUserSchema });
}

export async function onboardBuyer(client: ApiClient, name: string): Promise<SyncedUser> {
  return client.request('/auth/onboard', {
    method: 'POST',
    auth: true,
    envelope: true,
    schema: syncedUserSchema,
    body: { name, role: 'BUYER' },
  });
}
