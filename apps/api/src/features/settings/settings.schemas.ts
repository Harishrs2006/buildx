import { z } from 'zod';

const percent = z.number().finite().min(0).max(100).multipleOf(0.01, 'Use at most 2 decimals').nullable();
const rupees = z.number().finite().min(0).max(1_00_000).multipleOf(0.01, 'Use at most 2 decimals');

export const commissionSchema = z.object({
  // null clears the value (category goes back to "not configured")
  platformDeliveryPercent: percent,
  supplierDeliveryPercent: percent,
});

export const vehicleCreateSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z][A-Z0-9_]{1,29}$/, 'Code: capital letters, digits and _ only, e.g. MINI_TRUCK'),
  name: z.string().trim().min(2).max(60),
  maxLoadKg: z.number().finite().min(1).max(1_00_000),
  baseFare: rupees,
  perKmRate: rupees,
  isActive: z.boolean().optional(),
});

export const vehicleUpdateSchema = vehicleCreateSchema.omit({ code: true }).partial();

export const generalSettingsSchema = z.object({
  offerTimeoutMinutes: z.number().int().min(1).max(1440).nullable(),
});
