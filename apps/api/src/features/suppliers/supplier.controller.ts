import { Request, Response, NextFunction } from 'express';
import { isValidObjectId } from 'mongoose';
import { SupplierProfile } from '../../infrastructure/database/models/SupplierProfile.model';
import { Product } from '../../infrastructure/database/models/Product.model';
import { Order } from '../../infrastructure/database/models/Order.model';
import { AppError } from '../../shared/errors/AppError';
import { ok } from '@buildx/shared';

async function getSupplierProfile(userId: string) {
  const profile = await SupplierProfile.findOne({ userId }).lean();
  if (!profile) throw AppError.notFound('Supplier profile');
  return profile;
}

export async function getProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const profile = await getSupplierProfile(req.auth!.userId);
    res.json(ok(profile));
  } catch (err) { next(err); }
}

export async function updateProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const allowed = ['businessName', 'description', 'whatsappNumber', 'deliveryRadiusKm', 'serviceAreas', 'categories'];
    const update: Record<string, unknown> = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }

    const profile = await SupplierProfile.findOneAndUpdate(
      { userId: req.auth!.userId },
      update,
      { new: true }
    ).lean();
    if (!profile) throw AppError.notFound('Supplier profile');
    res.json(ok(profile));
  } catch (err) { next(err); }
}

export async function getStats(req: Request, res: Response, next: NextFunction) {
  try {
    const profile = await getSupplierProfile(req.auth!.userId);
    const supplierId = profile._id;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayOrders, pendingOrders, activeProducts, revenueResult] = await Promise.all([
      Order.countDocuments({ supplierId, createdAt: { $gte: today } }),
      Order.countDocuments({ supplierId, status: { $in: ['CONFIRMED', 'IN_TRANSIT'] } }),
      Product.countDocuments({ supplierId, status: 'ACTIVE' }),
      Order.aggregate([
        { $match: { supplierId, status: 'DELIVERED' } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
    ]);

    res.json(ok({
      todayOrders,
      pendingOrders,
      activeProducts,
      totalRevenue: revenueResult[0]?.total ?? 0,
    }));
  } catch (err) { next(err); }
}

export async function listSupplierOrders(req: Request, res: Response, next: NextFunction) {
  try {
    const profile = await getSupplierProfile(req.auth!.userId);
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(20, parseInt(req.query.limit as string, 10) || 10);
    const status = req.query.status as string | undefined;

    const filter: Record<string, unknown> = { supplierId: profile._id };
    if (status) filter.status = status;

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('buyerId', 'name phone')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Order.countDocuments(filter),
    ]);

    res.json(ok(orders, { total, page, limit, totalPages: Math.ceil(total / limit), hasNext: page * limit < total, hasPrev: page > 1 }));
  } catch (err) { next(err); }
}

export async function updateOrderStatus(req: Request, res: Response, next: NextFunction) {
  try {
    if (!isValidObjectId(req.params.id)) throw AppError.badRequest('Invalid order ID');

    const profile = await getSupplierProfile(req.auth!.userId);
    const { status } = req.body as { status: string };

    const allowed = ['READY_FOR_PICKUP', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'];
    if (!allowed.includes(status)) {
      throw AppError.badRequest(`Status must be one of: ${allowed.join(', ')}`);
    }

    const update: Record<string, unknown> = { status };
    if (status === 'DELIVERED') {
      update.deliveredAt = new Date();
      update.paymentStatus = 'CAPTURED';
    }
    if (status === 'CANCELLED') {
      update.cancelledAt = new Date();
      if (req.body.reason) update.cancellationReason = req.body.reason;
    }

    const order = await Order.findOneAndUpdate(
      { _id: req.params.id, supplierId: profile._id },
      update,
      { new: true }
    ).lean();

    if (!order) throw AppError.notFound('Order');
    res.json(ok(order));
  } catch (err) { next(err); }
}

export async function listSupplierProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const profile = await getSupplierProfile(req.auth!.userId);
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(20, parseInt(req.query.limit as string, 10) || 10);
    const status = req.query.status as string | undefined;

    const filter: Record<string, unknown> = { supplierId: profile._id };
    if (status) filter.status = status;

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate('categoryId', 'name slug')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Product.countDocuments(filter),
    ]);

    res.json(ok(products, { total, page, limit, totalPages: Math.ceil(total / limit), hasNext: page * limit < total, hasPrev: page > 1 }));
  } catch (err) { next(err); }
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export async function createProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const profile = await getSupplierProfile(req.auth!.userId);

    const { name, categoryId, description, shortDescription, unit, basePrice, gstRate, isGstInclusive,
      stockQuantity, minOrderQuantity, deliveryDays, tags, specifications } = req.body;

    if (!name || !categoryId || !description || !unit || basePrice == null) {
      throw AppError.badRequest('name, categoryId, description, unit, basePrice are required');
    }

    const baseSlug = slugify(name);
    let slug = baseSlug;
    let counter = 0;
    while (await Product.exists({ slug })) {
      counter++;
      slug = `${baseSlug}-${counter}`;
    }

    const product = await Product.create({
      supplierId: profile._id,
      categoryId,
      name,
      slug,
      description,
      shortDescription,
      unit,
      basePrice,
      gstRate: gstRate ?? 18,
      isGstInclusive: isGstInclusive ?? true,
      stockQuantity: stockQuantity ?? 0,
      minOrderQuantity: minOrderQuantity ?? 1,
      deliveryDays: deliveryDays ?? 2,
      tags: tags ?? [],
      specifications: specifications ?? {},
      status: 'ACTIVE',
    });

    res.status(201).json(ok(product));
  } catch (err) { next(err); }
}

export async function updateProduct(req: Request, res: Response, next: NextFunction) {
  try {
    if (!isValidObjectId(req.params.id)) throw AppError.badRequest('Invalid product ID');

    const profile = await getSupplierProfile(req.auth!.userId);

    const editable = ['name', 'description', 'shortDescription', 'basePrice', 'gstRate', 'isGstInclusive',
      'stockQuantity', 'minOrderQuantity', 'deliveryDays', 'tags', 'specifications', 'status', 'unit'];
    const update: Record<string, unknown> = {};
    for (const key of editable) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }

    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, supplierId: profile._id },
      update,
      { new: true }
    ).lean();
    if (!product) throw AppError.notFound('Product');
    res.json(ok(product));
  } catch (err) { next(err); }
}

export async function deleteProduct(req: Request, res: Response, next: NextFunction) {
  try {
    if (!isValidObjectId(req.params.id)) throw AppError.badRequest('Invalid product ID');
    const profile = await getSupplierProfile(req.auth!.userId);

    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, supplierId: profile._id },
      { status: 'DISCONTINUED' },
      { new: true }
    ).lean();
    if (!product) throw AppError.notFound('Product');
    res.json(ok({ message: 'Product discontinued' }));
  } catch (err) { next(err); }
}
