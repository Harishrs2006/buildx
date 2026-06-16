import { Router } from 'express';
import { requireAuth } from '../../shared/middleware/auth.middleware';
import { submitReview, getSupplierReviews, getOrderReview } from './review.controller';

export const reviewRoutes = Router();

reviewRoutes.post('/orders/:orderId', requireAuth, submitReview);
reviewRoutes.get('/orders/:orderId', requireAuth, getOrderReview);
reviewRoutes.get('/suppliers/:supplierId', getSupplierReviews);
