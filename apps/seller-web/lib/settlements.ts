import { z } from 'zod';
import type { ApiClient } from '@sthiva/web-core';

// Money between Sthiva and the supplier. Shapes mirror apps/api settlement.service.ts (myView).
const lineSchema = z.object({ orderId: z.string(), orderNumber: z.string(), deliveredAt: z.string().optional(), earned: z.number(), cashHeld: z.number() });
export const statementSchema = z
  .object({
    _id: z.string(), number: z.string(), orders: z.array(lineSchema),
    earned: z.number(), cashHeld: z.number(), net: z.number(),
    status: z.enum(['PENDING', 'PAID', 'CANCELLED']), reference: z.string().optional(), paidAt: z.string().optional(), createdAt: z.string(),
  })
  .passthrough();
export type Statement = z.infer<typeof statementSchema>;
export const payoutsSchema = z.object({
  balance: z.object({ orders: z.number(), earned: z.number(), cashHeld: z.number(), net: z.number(), waitingForCash: z.number() }).passthrough(),
  settlements: z.array(statementSchema),
});
export type Payouts = z.infer<typeof payoutsSchema>;

export async function fetchPayouts(client: ApiClient): Promise<Payouts> {
  return client.request('/suppliers/me/settlements', { auth: true, envelope: true, schema: payoutsSchema });
}
