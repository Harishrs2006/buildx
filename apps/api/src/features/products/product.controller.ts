import { Request, Response, NextFunction } from 'express';
import { isValidObjectId } from 'mongoose';
import { Product } from '../../infrastructure/database/models/Product.model';
import { Category } from '../../infrastructure/database/models/Category.model';
import { checkSupplier, eligibleSupplierIds, resolveDestination, type Destination } from '../serviceability/serviceability.service';

// Public catalogue. Every client (mobile included) only sees ACTIVE products from suppliers that
// are verified, active and not suspended. With ?pincode=, results are further limited to
// suppliers that deliver to that PIN; without it the response is unchanged for older clients.

export async function listProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const { category, sort = 'popular', q, page = '1', limit = '20', pincode } = req.query as Record<string, string>;

    let destination: Destination | undefined;
    if (pincode !== undefined) destination = await resolveDestination(pincode);
    const supplierIds = await eligibleSupplierIds(destination?.pincode);

    const filter: Record<string, unknown> = { status: 'ACTIVE', supplierId: { $in: supplierIds } };

    if (typeof category === 'string' && category) {
      const cat = await Category.findOne({ slug: category }).lean();
      if (cat) filter.categoryId = cat._id;
    }

    if (q) {
      filter.$text = { $search: q };
    }

    const sortMap: Record<string, [string, 1 | -1][]> = {
      popular:    [['totalSold', -1]],
      price_asc:  [['basePrice', 1]],
      price_desc: [['basePrice', -1]],
      newest:     [['createdAt', -1]],
    };

    const pageNum  = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));

    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort(sortMap[sort] ?? sortMap.popular)
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .populate('supplierId', 'businessName avgRating')
        .populate('categoryId', 'name slug')
        .lean(),
      Product.countDocuments(filter),
    ]);

    res.json({
      products,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
      // Only present when a PIN was given (additive for older clients)
      ...(destination && {
        location: {
          ...destination,
          serviceable: supplierIds.length > 0,
          supplierCount: supplierIds.length,
          ...(supplierIds.length === 0 ? { reason: 'NO_SUPPLIERS' } : {}),
        },
      }),
    });
  } catch (err) {
    next(err);
  }
}

export async function getProduct(req: Request, res: Response, next: NextFunction) {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid product ID' });
    }
    const { pincode } = req.query as Record<string, string>;
    const destination = pincode !== undefined ? await resolveDestination(pincode) : undefined;

    const product = await Product.findOne({ _id: req.params.id, status: 'ACTIVE' })
      .populate('supplierId', 'businessName avgRating totalDeliveries whatsappNumber verificationStatus')
      .populate('categoryId', 'name slug')
      .lean();
    if (!product) return res.status(404).json({ message: 'Product not found' });

    // Hidden, unverified or suspended suppliers' listings are not public
    const supplier = product.supplierId as unknown as { _id: string } | null;
    const eligibility = supplier
      ? await checkSupplier({ supplierProfileId: supplier._id, pincode: destination?.pincode })
      : { serviceable: false as const, reason: 'SUPPLIER_NOT_AVAILABLE' as const };
    if (!eligibility.serviceable && eligibility.reason === 'SUPPLIER_NOT_AVAILABLE') {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({
      ...product,
      // Only present when a PIN was given: can this product be delivered there?
      ...(destination && {
        availability: {
          ...destination,
          deliverable: eligibility.serviceable,
          ...(!eligibility.serviceable ? { reason: eligibility.reason } : {}),
        },
      }),
    });
  } catch (err) {
    next(err);
  }
}
