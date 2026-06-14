import { Router } from 'express';
import { requireAuth } from '../../shared/middleware/auth.middleware';
import { createOrder, listOrders, getOrder } from './order.controller';

const router = Router();

router.use(requireAuth);

router.post('/', createOrder);
router.get('/', listOrders);
router.get('/:id', getOrder);

export { router as orderRoutes };
