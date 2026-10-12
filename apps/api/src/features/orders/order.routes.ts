import { Router } from 'express';
import { requireAuth, requireRole } from '../../shared/middleware/auth.middleware';
import { validate } from '../../shared/middleware/validate.middleware';
import { createOrder, listOrders, getOrder, quote, cancelOrder } from './order.controller';
import { createOrderSchema, quoteSchema, cancelSchema } from './order.schemas';

const router = Router();

// Buyer-only; every handler also scopes queries to req.auth.userId
router.use(requireAuth, requireRole('BUYER'));

router.post('/quote', validate(quoteSchema), quote);
router.post('/', validate(createOrderSchema), createOrder);
router.get('/', listOrders);
router.get('/:id', getOrder);
router.post('/:id/cancel', validate(cancelSchema), cancelOrder);

export { router as orderRoutes };
