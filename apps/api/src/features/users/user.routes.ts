import { Router } from 'express';
import { userController } from './user.controller';
import { requireAuth } from '../../shared/middleware/auth.middleware';
import { validate } from '../../shared/middleware/validate.middleware';
import { updateProfileSchema, completeOnboardingSchema } from './user.schema';

const router = Router();

router.use(requireAuth);

// GET /api/v1/users/me
router.get('/me', userController.getMe.bind(userController));

// PATCH /api/v1/users/me
router.patch(
  '/me',
  validate(updateProfileSchema),
  userController.updateProfile.bind(userController)
);

// POST /api/v1/users/onboarding
router.post(
  '/onboarding',
  validate(completeOnboardingSchema),
  userController.completeOnboarding.bind(userController)
);

export { router as userRoutes };
