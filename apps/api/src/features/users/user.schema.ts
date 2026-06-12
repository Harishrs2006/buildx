import { z } from 'zod';

export const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{9,14}$/, 'Invalid phone number')
    .optional(),
});

export const completeOnboardingSchema = z.discriminatedUnion('role', [
  z.object({
    role: z.literal('BUYER'),
    companyName: z.string().min(1).max(200).optional(),
    gstin: z
      .string()
      .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GSTIN')
      .optional(),
    billingAddress: z
      .object({
        line1: z.string().min(1),
        line2: z.string().optional(),
        city: z.string().min(1),
        state: z.string().min(1),
        pincode: z.string().regex(/^\d{6}$/, 'Invalid pincode'),
        country: z.string().default('India'),
      })
      .optional(),
  }),
  z.object({
    role: z.literal('SUPPLIER'),
    businessName: z.string().min(2).max(200),
    description: z.string().max(1000).optional(),
    website: z.string().url().optional(),
    establishedYear: z.number().int().min(1900).max(new Date().getFullYear()).optional(),
    gstin: z
      .string()
      .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GSTIN')
      .optional(),
    address: z.object({
      line1: z.string().min(1),
      line2: z.string().optional(),
      city: z.string().min(1),
      state: z.string().min(1),
      pincode: z.string().regex(/^\d{6}$/, 'Invalid pincode'),
      country: z.string().default('India'),
    }),
    serviceAreas: z.array(z.string()).min(1, 'At least one service area required'),
  }),
]);

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type CompleteOnboardingInput = z.infer<typeof completeOnboardingSchema>;
