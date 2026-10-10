import { Router } from 'express';
import { requireAuth, requireRole } from '../../shared/middleware/auth.middleware';
import {
  getProfile, updateProfile, getStats, getAnalytics,
  listSupplierOrders, updateOrderStatus,
  listSupplierProducts, createProduct, updateProduct, deleteProduct,
} from './supplier.controller';

const router = Router();

// Supplier-only; every handler resolves the caller's own SupplierProfile
router.use(requireAuth, requireRole('SUPPLIER'));

router.get('/me', getProfile);
router.patch('/me', updateProfile);
router.get('/me/stats', getStats);
router.get('/me/analytics', getAnalytics);

router.get('/me/orders', listSupplierOrders);
router.patch('/me/orders/:id/status', updateOrderStatus);

router.get('/me/products', listSupplierProducts);
router.post('/me/products', createProduct);
router.patch('/me/products/:id', updateProduct);
router.delete('/me/products/:id', deleteProduct);

export { router as supplierRoutes };
