import { Request, Response, NextFunction } from 'express';
import { isValidObjectId } from 'mongoose';
import { Review } from '../../infrastructure/database/models/Review.model';
import { Order } from '../../infrastructure/database/models/Order.model';
import { SupplierProfile } from '../../infrastructure/database/models/SupplierProfile.model';
import { AppError } from '../../shared/errors/AppError';
import { ok } from '@buildx/shared';

export async function submitReview(req: Request, res: Response, next: NextFunction) {
  try {
    const { orderId } = req.params;
    if (!isValidObjectId(orderId)) throw AppError.badRequest('Invalid order ID');

    const { rating, comment, tags } = req.body as {
      rating: number;
      comment?: string;
      tags?: string[];
    };

    if (!rating || rating < 1 || rating > 5) {
      throw AppError.badRequest('Rating must be between 1 and 5');
    }

    const order = await Order.findOne({ _id: orderId, buyerId: req.auth!.userId, status: 'DELIVERED' }).lean();
    if (!order) throw AppError.notFound('Order (must be delivered to review)');

    const existing = await Review.findOne({ orderId }).lean();
    if (existing) throw AppError.badRequest('You already reviewed this order');

    const review = await Review.create({
      orderId,
      reviewerId: req.auth!.userId,
      supplierId: order.supplierId,
      productId: order.items[0]?.productId,
      rating,
      comment: comment?.trim(),
      images: [],
      isVerifiedPurchase: true,
      tags,
    });

    // Update supplier avg rating
    const [agg] = await Review.aggregate([
      { $match: { supplierId: order.supplierId } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    if (agg) {
      await SupplierProfile.findByIdAndUpdate(order.supplierId, {
        avgRating: Math.round(agg.avg * 10) / 10,
      });
    }

    res.status(201).json(ok({ reviewId: review._id, rating: review.rating }));
  } catch (err) {
    next(err);
  }
}

export async function getSupplierReviews(req: Request, res: Response, next: NextFunction) {
  try {
    const { supplierId } = req.params;
    if (!isValidObjectId(supplierId)) throw AppError.badRequest('Invalid supplier ID');

    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(20, parseInt(req.query.limit as string, 10) || 10);

    const [reviews, total] = await Promise.all([
      Review.find({ supplierId })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('reviewerId', 'name')
        .lean(),
      Review.countDocuments({ supplierId }),
    ]);

    res.json(ok(reviews, {
      total, page, limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    }));
  } catch (err) {
    next(err);
  }
}

export async function getOrderReview(req: Request, res: Response, next: NextFunction) {
  try {
    const { orderId } = req.params;
    if (!isValidObjectId(orderId)) throw AppError.badRequest('Invalid order ID');

    const review = await Review.findOne({ orderId, reviewerId: req.auth!.userId }).lean();
    res.json(ok(review ?? null));
  } catch (err) {
    next(err);
  }
}
