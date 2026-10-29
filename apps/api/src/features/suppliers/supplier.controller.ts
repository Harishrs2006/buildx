import { Request, Response, NextFunction } from 'express';
import { isValidObjectId } from 'mongoose';
import { SupplierProfile } from '../../infrastructure/database/models/SupplierProfile.model';
import { Product } from '../../infrastructure/database/models/Product.model';
import { Order } from '../../infrastructure/database/models/Order.model';
import { DeliveryPartner } from '../../infrastructure/database/models/DeliveryPartner.model';
import { AppError } from '../../shared/errors/AppError';
import { ok } from '@buildx/shared';
import { notifyUser, notifyUsers } from '../../shared/services/notification.service';
import { logger } from '../../shared/logger/logger';
import { cancelOrder, transitionOrder, recordCodCollected } from '../orders/order.service';

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
    // req.body was validated by updateProfileSchema (supplier.routes.ts): only known fields remain
    const update: Record<string, unknown> = { ...req.body };
    const unset: Record<string, ''> = {};
    if (update.gstin === '') {
      delete update.gstin;
      unset.gstin = '';
    }
    if (Array.isArray(update.brands)) update.brands = [...new Set(update.brands as string[])];
    if (Array.isArray(update.categories)) update.categories = [...new Set(update.categories as string[])];

    const profile = await SupplierProfile.findOneAndUpdate(
      { userId: req.auth!.userId },
      Object.keys(unset).length ? { $set: update, $unset: unset } : { $set: update },
      { new: true, runValidators: true }
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

export async function getAnalytics(req: Request, res: Response, next: NextFunction) {
  try {
    const profile = await getSupplierProfile(req.auth!.userId);
    const supplierId = profile._id;

    // Revenue for last 7 days
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - (6 - i));
      return d;
    });

    const [revenueByDay, topProducts, orderStatusBreakdown] = await Promise.all([
      Promise.all(
        days.map(async (day) => {
          const next = new Date(day.getTime() + 86400000);
          const agg = await Order.aggregate([
            { $match: { supplierId, status: 'DELIVERED', createdAt: { $gte: day, $lt: next } } },
            { $group: { _id: null, revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
          ]);
          return {
            date: day.toISOString().slice(0, 10),
            revenue: agg[0]?.revenue ?? 0,
            orders: agg[0]?.orders ?? 0,
          };
        })
      ),
      Product.find({ supplierId, status: 'ACTIVE' })
        .sort({ totalSold: -1 })
        .limit(5)
        .select('name totalSold basePrice unit')
        .lean(),
      Order.aggregate([
        { $match: { supplierId } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    res.json(ok({ revenueByDay, topProducts, orderStatusBreakdown }));
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

// PATCH /suppliers/me/orders/:id/status
//   READY_FOR_PICKUP — dispatch via a BuildX delivery partner (PLATFORM mode)
//   IN_TRANSIT       — dispatch with the supplier's own vehicle (SUPPLIER mode); also takes over
//                      a READY_FOR_PICKUP order no driver has accepted yet
//   DELIVERED        — only for orders the supplier is delivering themselves
//   CANCELLED        — reject before dispatch; restores stock
// Delivery progress on PLATFORM orders belongs to the assigned driver.
export async function updateOrderStatus(req: Request, res: Response, next: NextFunction) {
  try {
    if (!isValidObjectId(req.params.id)) throw AppError.badRequest('Invalid order ID');

    const profile = await getSupplierProfile(req.auth!.userId);
    const { status, reason } = req.body as {
      status: 'READY_FOR_PICKUP' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';
      reason?: string;
    };
    const filter = { _id: req.params.id, supplierId: profile._id };
    const userId = req.auth!.userId;
    const now = new Date();

    const { order, changed } =
      status === 'CANCELLED'
        ? await cancelOrder({ filter, actor: 'SUPPLIER', userId, reason })
        : status === 'READY_FOR_PICKUP'
          ? await transitionOrder({ filter, to: status, actor: 'SUPPLIER', mode: 'PLATFORM', userId, set: { deliveryMode: 'PLATFORM' } })
          : status === 'IN_TRANSIT'
            ? await transitionOrder({ filter, to: status, actor: 'SUPPLIER', mode: 'SUPPLIER', userId, set: { deliveryMode: 'SUPPLIER', dispatchedAt: now } })
            : await transitionOrder({ filter, to: status, actor: 'SUPPLIER', mode: 'SUPPLIER', userId, set: { deliveredAt: now } });

    // Fire-and-forget notifications, only when this request actually changed the order
    if (!changed) {
      // no-op
    } else if (status === 'READY_FOR_PICKUP') {
      // Broadcast to all available drivers
      DeliveryPartner.find({ isAvailable: true }).select('userId').lean().then((drivers) => {
        const driverUserIds = drivers.map((d) => d.userId.toString());
        return notifyUsers(driverUserIds, {
          title: '📦 Order Ready for Pickup',
          body: `Order ${order.orderNumber} is ready · ₹${order.total.toLocaleString('en-IN')} COD`,
          data: { screen: 'driver_available', orderId: order._id.toString() },
        });
      }).catch((err) => {
        logger.error('Driver notification lookup failed', { orderId: order._id.toString(), error: err?.message });
      });
    } else if (status === 'IN_TRANSIT') {
      notifyUser(order.buyerId.toString(), {
        title: '🚚 On the way',
        body: `${profile.businessName} is delivering your order ${order.orderNumber}.`,
        data: { screen: 'buyer_orders', orderId: order._id.toString() },
      });
    } else if (status === 'DELIVERED') {
      notifyUser(order.buyerId.toString(), {
        title: '✅ Delivered!',
        body: `Order ${order.orderNumber} delivered. Please pay ₹${order.total.toLocaleString('en-IN')} cash to ${profile.businessName}.`,
        data: { screen: 'buyer_orders', orderId: order._id.toString() },
      });
    } else if (status === 'CANCELLED') {
      notifyUser(order.buyerId.toString(), {
        title: '❌ Order Cancelled',
        body: `Your order ${order.orderNumber} has been cancelled by the supplier.`,
        data: { screen: 'buyer_orders', orderId: order._id.toString() },
      });
    }

    res.json(ok(order));
  } catch (err) { next(err); }
}

// POST /suppliers/me/orders/:id/cod — supplier confirms exact COD amount on an order they delivered
export async function confirmCodCollected(req: Request, res: Response, next: NextFunction) {
  try {
    if (!isValidObjectId(req.params.id)) throw AppError.badRequest('Invalid order ID');
    const profile = await getSupplierProfile(req.auth!.userId);
    const { order } = await recordCodCollected({
      filter: { _id: req.params.id, supplierId: profile._id, deliveryMode: 'SUPPLIER' },
      collectorUserId: req.auth!.userId,
      collectorRole: 'SUPPLIER',
      amount: req.body.amount,
    });
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

export async function getSupplierProduct(req: Request, res: Response, next: NextFunction) {
  try {
    if (!isValidObjectId(req.params.id)) throw AppError.badRequest('Invalid product ID');
    const profile = await getSupplierProfile(req.auth!.userId);

    const product = await Product.findOne({ _id: req.params.id, supplierId: profile._id })
      .populate('categoryId', 'name slug')
      .lean();
    if (!product) throw AppError.notFound('Product');
    res.json(ok(product));
  } catch (err) { next(err); }
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export async function createProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const profile = await getSupplierProfile(req.auth!.userId);

    const { name, categoryId, description, shortDescription, unit, basePrice, gstRate, isGstInclusive,
      stockQuantity, minOrderQuantity, deliveryDays, tags, specifications, images } = req.body;

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
      images: images ?? [],
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
      'stockQuantity', 'minOrderQuantity', 'deliveryDays', 'tags', 'specifications', 'status', 'unit', 'images'];
    const update: Record<string, unknown> = {};
    for (const key of editable) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }

    // Stock drives availability: 0 hides the listing as out of stock, restocking brings it back.
    // An explicit status in the same request (e.g. DRAFT or DISCONTINUED) always wins.
    if (typeof update.stockQuantity === 'number' && update.status === undefined) {
      const current = await Product.findOne({ _id: req.params.id, supplierId: profile._id }).select('status').lean();
      if (current) {
        if (update.stockQuantity <= 0 && current.status === 'ACTIVE') update.status = 'OUT_OF_STOCK';
        if (update.stockQuantity > 0 && current.status === 'OUT_OF_STOCK') update.status = 'ACTIVE';
      }
    }

    // runValidators: stock/price/GST bounds in the schema apply to edits too
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, supplierId: profile._id },
      update,
      { new: true, runValidators: true }
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
