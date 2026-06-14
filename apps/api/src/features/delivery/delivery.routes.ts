import { Router } from 'express';
import { requireAuth } from '../../shared/middleware/auth.middleware';
import {
  listAvailableOrders, assignOrder,
  listMyOrders, updateDeliveryStatus,
  getProfile, updateProfile, getStats,
} from './delivery.controller';

const router = Router();

router.use(requireAuth);

// Available pickups (any driver can see)
router.get('/available', listAvailableOrders);

// Driver self-assign
router.post('/orders/:id/assign', assignOrder);

// Driver's own orders
router.get('/my-orders', listMyOrders);
router.patch('/orders/:id/status', updateDeliveryStatus);

// Driver profile
router.get('/me', getProfile);
router.patch('/me', updateProfile);
router.get('/me/stats', getStats);

export { router as deliveryRoutes };
