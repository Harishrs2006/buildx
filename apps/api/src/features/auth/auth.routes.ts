import { Router } from 'express';
import { z } from 'zod';
import { SELF_ASSIGNABLE_ROLES } from '@buildx/shared';
import { authController } from './auth.controller';
import { requireAuth, verifyFirebaseToken } from '../../shared/middleware/auth.middleware';
import { validate } from '../../shared/middleware/validate.middleware';

const router = Router();

const indianMobile = z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number');

export const onboardSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    // Only self-assignable roles — OPERATOR/ADMIN can never be chosen by the client
    role: z.enum(SELF_ASSIGNABLE_ROLES),
    // Supplier-specific
    businessName: z.string().trim().min(2).max(200).optional(),
    whatsappNumber: indianMobile.optional(),
    deliveryRadiusKm: z.coerce.number().min(1).max(500).optional(),
    serviceAreas: z.array(z.string().trim().min(1).max(100)).max(50).optional(),
    // Delivery-partner-specific
    vehicleType: z.enum(['BIKE', 'AUTO', 'MINI_TRUCK', 'TEMPO', 'TRUCK', 'TRACTOR']).optional(),
    vehicleNumber: z.string().trim().toUpperCase().min(4).max(20).optional(),
    licenseNumber: z.string().trim().toUpperCase().min(5).max(30).optional(),
  })
  .superRefine((body, ctx) => {
    const requireField = (field: keyof typeof body) => {
      if (body[field] === undefined) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [field], message: `${field} is required for ${body.role}` });
      }
    };
    if (body.role === 'SUPPLIER') {
      requireField('businessName');
      requireField('whatsappNumber');
    }
    if (body.role === 'DELIVERY_PARTNER') {
      requireField('vehicleType');
      requireField('vehicleNumber');
      requireField('licenseNumber');
    }
  });

export type OnboardInput = z.infer<typeof onboardSchema>;

// Called after Firebase phone OTP verification — creates/syncs DB user.
// Only needs a valid Firebase token: a first-time user has no MongoDB record yet.
router.post('/sync', verifyFirebaseToken, authController.sync.bind(authController));

// Called after OTP verified + role selected — completes onboarding
router.post('/onboard', requireAuth, validate(onboardSchema), authController.onboard.bind(authController));

export { router as authRoutes };
