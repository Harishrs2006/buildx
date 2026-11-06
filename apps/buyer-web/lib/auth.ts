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

// Called right after Firebase sign-in succeeds (phone code or Google) (first time or returning buyer)
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

export async function onboardBuyer(client: ApiClient, name: string): Promise<SyncedUser> {
  return client.request('/auth/onboard', {
    method: 'POST',
    auth: true,
    envelope: true,
    schema: syncedUserSchema,
    body: { name, role: 'BUYER' },
  });
}

// Erases the account (DELETE /users/me). Refused with 409 while an order is still open.
export async function deleteAccount(client: ApiClient): Promise<void> {
  await client.request('/users/me', { method: 'DELETE', auth: true, envelope: true, schema: z.object({ deleted: z.literal(true) }) });
}
