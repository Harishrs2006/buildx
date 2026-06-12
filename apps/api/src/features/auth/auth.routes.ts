import { Router } from 'express';
import { authController } from './auth.controller';
import { requireAuth } from '../../shared/middleware/auth.middleware';
import { validate } from '../../shared/middleware/validate.middleware';
import { z } from 'zod';

const router = Router();

const onboardSchema = z.object({
  name: z.string().min(2).max(100),
  role: z.enum(['BUYER', 'SUPPLIER']),
  // Supplier-specific
  businessName: z.string().min(2).max(200).optional(),
  whatsappNumber: z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number').optional(),
  deliveryRadiusKm: z.coerce.number().min(1).max(500).default(30).optional(),
  serviceAreas: z.array(z.string()).default([]).optional(),
});

// Called after Firebase phone OTP verification — creates/syncs DB user
router.post('/sync', requireAuth, authController.sync.bind(authController));

// Called after OTP verified + role selected — completes onboarding
router.post('/onboard', requireAuth, validate(onboardSchema), authController.onboard.bind(authController));

export { router as authRoutes };
