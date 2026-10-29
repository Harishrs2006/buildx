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

// GSTIN: 2-digit state code, 10-character PAN, entity number, 'Z', check character
export const GSTIN_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

// Everything a supplier may change about their own profile; unknown fields are rejected
export const updateProfileSchema = z
  .object({
    businessName: z.string().trim().min(2).max(120),
    description: z.string().trim().max(1000),
    whatsappNumber: z.string().regex(/^(?:\+91)?[6-9]\d{9}$/, 'Enter a 10-digit Indian mobile number'),
    deliveryRadiusKm: z.number().int().min(1).max(500),
    serviceAreas: z.array(z.string().trim().min(1).max(80)).max(50),
    businessType: z.enum(['RETAILER', 'DEALER', 'DISTRIBUTOR', 'MANUFACTURER']),
    gstin: z.union([z.literal(''), z.string().trim().toUpperCase().regex(GSTIN_RE, 'Enter a valid 15-character GSTIN')]),
    address: z.string().trim().max(300),
    categories: z.array(z.string().trim().regex(/^[a-z0-9-]{2,60}$/)).max(20),
    brands: z.array(z.string().trim().min(1).max(60)).max(60),
  })
  .partial()
  .strict();

const router = Router();

// Supplier-only; every handler resolves the caller's own SupplierProfile
router.use(requireAuth, requireRole('SUPPLIER'));

router.get('/me', getProfile);
router.patch('/me', validate(updateProfileSchema), updateProfile);
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
