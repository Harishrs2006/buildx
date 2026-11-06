import { Router } from 'express';
import { requireAuth, requireRole } from '../../shared/middleware/auth.middleware';
import { validate } from '../../shared/middleware/validate.middleware';
import {
  buyerRequestSchema, buyerUpdateRequest, getDesign, listDesigns, myDesignRequests, requestDesign, requestDesignSchema,
} from './designs';

// Public design catalogue; asking for a quote needs a signed-in buyer
const router = Router();

router.get('/', listDesigns);
router.get('/requests/mine', requireAuth, requireRole('BUYER'), myDesignRequests);
router.patch('/requests/:id', requireAuth, requireRole('BUYER'), validate(buyerRequestSchema), buyerUpdateRequest);
router.get('/:id', getDesign);
router.post('/:id/requests', requireAuth, requireRole('BUYER'), validate(requestDesignSchema), requestDesign);

export { router as designRoutes };
