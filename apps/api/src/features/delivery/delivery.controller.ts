import { Request, Response, NextFunction } from 'express';
import { isValidObjectId } from 'mongoose';
import { Order } from '../../infrastructure/database/models/Order.model';
import { DeliveryPartner } from '../../infrastructure/database/models/DeliveryPartner.model';
import { AppError } from '../../shared/errors/AppError';
import { ok } from '@buildx/shared';

async function getDriverProfile(userId: string) {
  const profile = await DeliveryPartner.findOne({ userId }).lean();
  if (!profile) throw AppError.notFound('Delivery partner profile');
  return profile;
}

// GET /delivery/available — orders marked READY_FOR_PICKUP with no driver assigned
export async function listAvailableOrders(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(20, parseInt(req.query.limit as string, 10) || 10);

    const [orders, total] = await Promise.all([
      Order.find({ status: 'READY_FOR_PICKUP', driverId: { $exists: false } })
        .populate('supplierId', 'businessName whatsappNumber')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Order.countDocuments({ status: 'READY_FOR_PICKUP', driverId: { $exists: false } }),
    ]);

    res.json(ok(orders, { total, page, limit, totalPages: Math.ceil(total / limit), hasNext: page * limit < total, hasPrev: page > 1 }));
  } catch (err) { next(err); }
}

// POST /delivery/orders/:id/assign — driver self-assigns an available order
export async function assignOrder(req: Request, res: Response, next: NextFunction) {
  try {
    if (!isValidObjectId(req.params.id)) throw AppError.badRequest('Invalid order ID');

    const driverUserId = req.auth!.userId;

    const order = await Order.findOneAndUpdate(
      { _id: req.params.id, status: 'READY_FOR_PICKUP', driverId: { $exists: false } },
      { status: 'ASSIGNED', driverId: driverUserId, assignedAt: new Date() },
      { new: true }
    ).lean();

    if (!order) throw AppError.conflict('Order is no longer available for pickup');

    res.json(ok(order));
  } catch (err) { next(err); }
}

// GET /delivery/my-orders — orders assigned to this driver
export async function listMyOrders(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(20, parseInt(req.query.limit as string, 10) || 10);
    const status = req.query.status as string | undefined;

    const filter: Record<string, unknown> = { driverId: req.auth!.userId };
    if (status) filter.status = status;

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('supplierId', 'businessName whatsappNumber')
        .populate('buyerId', 'name phone')
        .sort({ assignedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Order.countDocuments(filter),
    ]);

    res.json(ok(orders, { total, page, limit, totalPages: Math.ceil(total / limit), hasNext: page * limit < total, hasPrev: page > 1 }));
  } catch (err) { next(err); }
}

// PATCH /delivery/orders/:id/status — driver marks PICKED_UP or DELIVERED
export async function updateDeliveryStatus(req: Request, res: Response, next: NextFunction) {
  try {
    if (!isValidObjectId(req.params.id)) throw AppError.badRequest('Invalid order ID');

    const { status } = req.body as { status: string };
    const allowed = ['PICKED_UP', 'DELIVERED'];
    if (!allowed.includes(status)) {
      throw AppError.badRequest(`Status must be one of: ${allowed.join(', ')}`);
    }

    const update: Record<string, unknown> = { status };
    if (status === 'PICKED_UP') update.pickedUpAt = new Date();
    if (status === 'DELIVERED') {
      update.deliveredAt = new Date();
      update.paymentStatus = 'CAPTURED';

      // Increment driver delivery count
      await DeliveryPartner.updateOne(
        { userId: req.auth!.userId },
        { $inc: { totalDeliveries: 1 } }
      );
    }

    const order = await Order.findOneAndUpdate(
      { _id: req.params.id, driverId: req.auth!.userId },
      update,
      { new: true }
    ).lean();

    if (!order) throw AppError.notFound('Order');
    res.json(ok(order));
  } catch (err) { next(err); }
}

// GET /delivery/me — driver profile
export async function getProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const profile = await getDriverProfile(req.auth!.userId);
    res.json(ok(profile));
  } catch (err) { next(err); }
}

// PATCH /delivery/me — update availability and service areas
export async function updateProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const allowed = ['isAvailable', 'serviceAreas', 'vehicleType', 'vehicleNumber'];
    const update: Record<string, unknown> = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }

    const profile = await DeliveryPartner.findOneAndUpdate(
      { userId: req.auth!.userId },
      update,
      { new: true }
    ).lean();
    if (!profile) throw AppError.notFound('Delivery partner profile');
    res.json(ok(profile));
  } catch (err) { next(err); }
}

// GET /delivery/stats — driver dashboard stats
export async function getStats(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.auth!.userId;
    const profile = await DeliveryPartner.findOne({ userId }).lean();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayDeliveries, activeOrders] = await Promise.all([
      Order.countDocuments({ driverId: userId, status: 'DELIVERED', deliveredAt: { $gte: today } }),
      Order.countDocuments({ driverId: userId, status: { $in: ['ASSIGNED', 'PICKED_UP'] } }),
    ]);

    res.json(ok({
      todayDeliveries,
      activeOrders,
      totalDeliveries: profile?.totalDeliveries ?? 0,
      avgRating: profile?.avgRating ?? 0,
      isAvailable: profile?.isAvailable ?? false,
    }));
  } catch (err) { next(err); }
}
