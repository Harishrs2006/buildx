import { Router } from 'express';
import { requireAuth, requireRole } from '../../shared/middleware/auth.middleware';
import { validate } from '../../shared/middleware/validate.middleware';
import { driverStatusSchema, codCollectedSchema } from '../orders/order.schemas';
import {
  listAvailableOrders, assignOrder,
  listMyOrders, updateDeliveryStatus, confirmCodCollected,
  getProfile, updateProfile, getStats,
} from './delivery.controller';

const router = Router();

// Delivery partners only — buyers/suppliers must not see pickup addresses or self-assign
router.use(requireAuth, requireRole('DELIVERY_PARTNER'));

// Available pickups (any delivery partner can see)
router.get('/available', listAvailableOrders);

// Driver self-assign
router.post('/orders/:id/assign', assignOrder);

// Driver's own orders
router.get('/my-orders', listMyOrders);
router.patch('/orders/:id/status', validate(driverStatusSchema), updateDeliveryStatus);
router.post('/orders/:id/cod', validate(codCollectedSchema), confirmCodCollected);

// Driver profile
router.get('/me', getProfile);
router.patch('/me', updateProfile);
router.get('/me/stats', getStats);

export { router as deliveryRoutes };
