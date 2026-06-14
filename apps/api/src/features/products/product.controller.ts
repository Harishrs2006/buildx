import { Request, Response, NextFunction } from 'express';
import { Product } from '../../infrastructure/database/models/Product.model';
import { Category } from '../../infrastructure/database/models/Category.model';

export async function listProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const { category, sort = 'popular', q, page = '1', limit = '20' } = req.query as Record<string, string>;

    const filter: Record<string, unknown> = { status: 'ACTIVE' };

    if (category) {
      const cat = await Category.findOne({ slug: category }).lean();
      if (cat) filter.categoryId = cat._id;
    }

    if (q) {
      filter.$text = { $search: q };
    }

    const sortMap: Record<string, Record<string, number>> = {
      popular:    { totalSold: -1 },
      price_asc:  { basePrice: 1 },
      price_desc: { basePrice: -1 },
      newest:     { createdAt: -1 },
    };

    const pageNum  = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, parseInt(limit, 10));

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
    });
  } catch (err) {
    next(err);
  }
}

export async function getProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const product = await Product.findById(req.params.id)
      .populate('supplierId', 'businessName avgRating totalDeliveries whatsappNumber verificationStatus')
      .populate('categoryId', 'name slug')
      .lean();

    if (!product) return res.status(404).json({ message: 'Product not found' });

    res.json(product);
  } catch (err) {
    next(err);
  }
}
