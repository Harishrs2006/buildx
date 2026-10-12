import { Router } from 'express';
import { requireAuth, requireRole } from '../../shared/middleware/auth.middleware';
import { createOrder, listOrders, getOrder } from './order.controller';

const router = Router();

// Buyer-only; every handler also scopes queries to req.auth.userId
router.use(requireAuth, requireRole('BUYER'));

router.post('/', createOrder);
router.get('/', listOrders);
router.get('/:id', getOrder);

export { router as orderRoutes };
