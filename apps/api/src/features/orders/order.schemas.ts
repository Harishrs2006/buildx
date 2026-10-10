import { z } from 'zod';
import { isValidObjectId } from 'mongoose';

const objectId = z.string().refine((v) => isValidObjectId(v), 'Invalid ID');

// Finite and positive here; unit-specific rules (whole units, MOQ, ≤3 decimals) are checked in pricing.ts
const quantity = z.number().finite().positive().max(1_000_000);

const cartItems = z
  .array(z.object({ productId: objectId, quantity }))
  .min(1, 'Cart is empty')
  .max(50)
  .refine((items) => new Set(items.map((i) => i.productId)).size === items.length, 'Each product may appear only once');

export const quoteSchema = z.object({ items: cartItems });

export const createOrderSchema = z.object({
  items: cartItems,
  deliveryAddress: z.object({
    label: z.string().trim().min(1).max(50),
    fullAddress: z.string().trim().min(5).max(500),
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    // The app pre-fills the account phone, which Firebase stores as +91XXXXXXXXXX
    contactPhone: z
      .string()
      .trim()
      .regex(/^(\+91)?[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number')
      .transform((v) => v.slice(-10)),
  }),
  notes: z.string().trim().max(500).optional(),
  deliveryMethod: z.enum(['STANDARD', 'EXPRESS']).default('STANDARD'),
  // Total the buyer saw on the summary screen; if prices moved since, the order is refused
  expectedTotal: z.number().finite().nonnegative().optional(),
});

export const cancelSchema = z.object({ reason: z.string().trim().max(300).optional() });

export const supplierStatusSchema = z.object({
  status: z.enum(['READY_FOR_PICKUP', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED']),
  reason: z.string().trim().max(300).optional(),
});

export const driverStatusSchema = z.object({ status: z.enum(['PICKED_UP', 'IN_TRANSIT', 'DELIVERED']) });

export const codCollectedSchema = z.object({ amount: z.number().finite().positive() });

// Client-generated per checkout attempt and reused on retries
export const IDEMPOTENCY_KEY = /^[A-Za-z0-9_-]{16,128}$/;

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type CartItemsInput = z.infer<typeof cartItems>;
