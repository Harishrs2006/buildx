import { z } from 'zod';
import { isValidObjectId } from 'mongoose';

const objectId = z.string().refine((v) => isValidObjectId(v), 'Invalid ID');
const reason = z.string().trim().min(3, 'Give a reason (at least 3 characters)').max(500);

export const ORDER_STATUSES = [
  'PENDING', 'CONFIRMED', 'READY_FOR_PICKUP', 'ASSIGNED', 'PICKED_UP',
  'IN_TRANSIT', 'DELIVERED', 'CANCELLED', 'DISPUTED',
] as const;

export const listOrdersQuery = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  // Order number search (exact or prefix), e.g. BX-M1K2
  q: z.string().trim().max(40).regex(/^[A-Za-z0-9-]*$/, 'Search by order number').optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const opsCancelSchema = z.object({
  reason,
  // Required once goods have left the supplier: did they come back into stock?
  restock: z.boolean().optional(),
});

export const opsUnassignSchema = z.object({ reason });
export const opsAssignSchema = z.object({ driverUserId: objectId, note: z.string().trim().max(500).optional() });
export const opsCodSchema = z.object({ amount: z.number().finite().positive(), note: reason });
export const opsNoteSchema = z.object({ note: z.string().trim().min(1).max(1000) });

export const supplierListQuery = z.object({
  verification: z.enum(['PENDING', 'VERIFIED', 'REJECTED']).optional(),
});
export const supplierVerificationSchema = z.object({
  status: z.enum(['VERIFIED', 'REJECTED']),
  note: z.string().trim().max(500).optional(),
});

export const userActiveSchema = z.object({ isActive: z.boolean(), reason });
