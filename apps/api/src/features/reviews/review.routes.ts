import { Router } from 'express';
import { requireAuth, requireRole } from '../../shared/middleware/auth.middleware';
import { submitReview, getSupplierReviews, getOrderReview } from './review.controller';

export const reviewRoutes = Router();

reviewRoutes.post('/orders/:orderId', requireAuth, requireRole('BUYER'), submitReview);
reviewRoutes.get('/orders/:orderId', requireAuth, requireRole('BUYER'), getOrderReview);
reviewRoutes.get('/suppliers/:supplierId', getSupplierReviews);
