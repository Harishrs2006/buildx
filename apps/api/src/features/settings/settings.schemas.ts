import { z } from 'zod';

const percent = z.number().finite().min(0).max(100).multipleOf(0.01, 'Use at most 2 decimals').nullable();
const rupees = z.number().finite().min(0).max(1_00_000).multipleOf(0.01, 'Use at most 2 decimals');

export const commissionSchema = z.object({
  // null clears the value (category goes back to "not configured")
  platformDeliveryPercent: percent,
  supplierDeliveryPercent: percent,
});

// Categories buyers browse by. The slug is made from the name once and never changes: supplier
// profiles and links point at it.
export const categoryCreateSchema = z.object({
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().max(300).optional(),
  sortOrder: z.number().int().min(0).max(1000).optional(),
});
export const categoryUpdateSchema = categoryCreateSchema
  .partial()
  .extend({ isActive: z.boolean().optional() })
  .refine((v) => Object.keys(v).length > 0, 'Nothing to change');

export const vehicleCreateSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z][A-Z0-9_]{1,29}$/, 'Code: capital letters, digits and _ only, e.g. MINI_TRUCK'),
  name: z.string().trim().min(2).max(60),
  maxLoadKg: z.number().finite().min(1).max(1_00_000),
  baseFare: rupees,
  perKmRate: rupees,
  isActive: z.boolean().optional(),
});

export const vehicleUpdateSchema = vehicleCreateSchema.omit({ code: true }).partial();

// Send only what changes; null switches a setting off
export const generalSettingsSchema = z
  .object({
    offerTimeoutMinutes: z.number().int().min(1).max(1440).nullable(),
    // Share of the delivery charge a Sthiva driver earns
    driverSharePercent: percent,
    driverOfferTimeoutMinutes: z.number().int().min(1).max(1440).nullable(),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Nothing to change');
