import { Router } from 'express';
import { requireAuth, requireRole } from '../../shared/middleware/auth.middleware';
import { validate } from '../../shared/middleware/validate.middleware';
import { supplierStatusSchema, codCollectedSchema } from '../orders/order.schemas';
import {
  getProfile, updateProfile, getStats, getAnalytics,
  listSupplierOrders, updateOrderStatus, confirmCodCollected,
  listSupplierProducts, getSupplierProduct, createProduct, updateProduct, deleteProduct,
} from './supplier.controller';
import { z } from 'zod';
import {
  listServicePincodes, addServicePincodes, removeServicePincode, previewServicePincode,
} from '../serviceability/service-pincodes.controller';
import { MAX_PINCODES_PER_REQUEST } from '../serviceability/serviceability.service';

// Strings are format-checked per item in the controller so each bad entry gets its own reason
const addPincodesSchema = z.object({
  pincodes: z.array(z.string().max(20)).min(1).max(MAX_PINCODES_PER_REQUEST),
});

const router = Router();

// Supplier-only; every handler resolves the caller's own SupplierProfile
router.use(requireAuth, requireRole('SUPPLIER'));

router.get('/me', getProfile);
router.patch('/me', updateProfile);
router.get('/me/stats', getStats);
router.get('/me/analytics', getAnalytics);

router.get('/me/orders', listSupplierOrders);
router.patch('/me/orders/:id/status', validate(supplierStatusSchema), updateOrderStatus);
router.post('/me/orders/:id/cod', validate(codCollectedSchema), confirmCodCollected);

router.get('/me/products', listSupplierProducts);
router.get('/me/products/:id', getSupplierProduct);
router.post('/me/products', createProduct);
router.patch('/me/products/:id', updateProduct);
router.delete('/me/products/:id', deleteProduct);

// Delivery coverage (PIN codes this supplier serves)
router.get('/me/service-pincodes', listServicePincodes);
router.post('/me/service-pincodes', validate(addPincodesSchema), addServicePincodes);
router.get('/me/service-pincodes/:pincode', previewServicePincode);
router.delete('/me/service-pincodes/:pincode', removeServicePincode);

export { router as supplierRoutes };
