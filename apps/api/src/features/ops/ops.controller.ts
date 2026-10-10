import { Request, Response, NextFunction } from 'express';
import { isValidObjectId, Types } from 'mongoose';
import { ok } from '@buildx/shared';
import { Order } from '../../infrastructure/database/models/Order.model';
import { User } from '../../infrastructure/database/models/User.model';
import { SupplierProfile } from '../../infrastructure/database/models/SupplierProfile.model';
import { DeliveryPartner } from '../../infrastructure/database/models/DeliveryPartner.model';
import { AppError } from '../../shared/errors/AppError';
import { logger } from '../../shared/logger/logger';
import { notifyUser } from '../../shared/services/notification.service';
import { cancelOrder, transitionOrder, recordCodByOps } from '../orders/order.service';
import { modeFilter } from '../orders/order-state';

type OpsRole = 'OPERATOR' | 'ADMIN';

function opsActor(req: Request) {
  return { userId: req.auth!.userId, role: req.auth!.role as OpsRole };
}

function orderId(req: Request): string {
  const id = String(req.params.id);
  if (!isValidObjectId(id)) throw AppError.badRequest('Invalid order ID');
  return id;
}

// Every ops action leaves an audit line: in the order's opsNotes and in the server log
function opsNote(req: Request, note: string) {
  const { userId, role } = opsActor(req);
  logger.info('[ops] action', { opsUserId: userId, role, path: req.path, note });
  return { $push: { opsNotes: { at: new Date(), byUserId: new Types.ObjectId(userId), byRole: role, note } } };
}

async function withOpsNote(id: string, req: Request, note: string) {
  return Order.findByIdAndUpdate(id, opsNote(req, note), { new: true }).select('+opsNotes').lean();
}

// ─── Attention queue ────────────────────────────────────────────────────────

// Thresholds for "stuck" orders during the pilot
export const ATTENTION = {
  CONFIRMED_MINUTES: 120,        // supplier hasn't dispatched
  READY_UNASSIGNED_MINUTES: 30,  // no driver has accepted
  ASSIGNED_MINUTES: 60,          // driver hasn't picked up
  IN_DELIVERY_MINUTES: 360,      // picked up / in transit too long
};

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000);
const summaryFields = 'orderNumber status total deliveryMode paymentStatus createdAt updatedAt supplierId buyerId driverId';

// GET /ops/summary — counts by status plus the queues that need a human
export async function summary(_req: Request, res: Response, next: NextFunction) {
  try {
    const queue = (filter: Record<string, unknown>) =>
      Order.find(filter)
        .select(summaryFields)
        .populate('supplierId', 'businessName whatsappNumber')
        .sort({ updatedAt: 1 })
        .limit(20)
        .lean();

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [byStatus, todayOrders, notDispatched, unassigned, notPickedUp, longInDelivery, codPending, uncheckedDestination] = await Promise.all([
      Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Order.countDocuments({ createdAt: { $gte: startOfDay } }),
      queue({ status: 'CONFIRMED', updatedAt: { $lt: minutesAgo(ATTENTION.CONFIRMED_MINUTES) } }),
      queue({ status: 'READY_FOR_PICKUP', updatedAt: { $lt: minutesAgo(ATTENTION.READY_UNASSIGNED_MINUTES) } }),
      queue({ status: 'ASSIGNED', updatedAt: { $lt: minutesAgo(ATTENTION.ASSIGNED_MINUTES) } }),
      queue({ status: { $in: ['PICKED_UP', 'IN_TRANSIT'] }, updatedAt: { $lt: minutesAgo(ATTENTION.IN_DELIVERY_MINUTES) } }),
      queue({ status: 'DELIVERED', paymentMethod: 'COD', paymentStatus: { $in: ['PENDING', 'PARTIAL'] } }),
      // Legacy app orders without a PIN: coverage was never checked — confirm with the supplier
      queue({ serviceabilityCheck: 'SKIPPED_NO_PINCODE', status: { $in: ['CONFIRMED', 'READY_FOR_PICKUP'] } }),
    ]);

    res.json(ok({
      counts: Object.fromEntries(byStatus.map((b) => [b._id, b.count])),
      todayOrders,
      thresholds: ATTENTION,
      attention: { notDispatched, unassigned, notPickedUp, longInDelivery, codPending, uncheckedDestination },
    }));
  } catch (err) { next(err); }
}

// ─── Orders ─────────────────────────────────────────────────────────────────

// GET /ops/orders?status=&q=&page=&limit=
export async function listOrders(req: Request, res: Response, next: NextFunction) {
  try {
    const { status, q, page, limit } = req.query as unknown as { status?: string; q?: string; page: number; limit: number };
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (q) filter.orderNumber = { $regex: `^${q.toUpperCase()}` }; // schema-validated: [A-Za-z0-9-] only

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .select(summaryFields)
        .populate('supplierId', 'businessName')
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

// GET /ops/orders/:id — full order incl. history and internal notes
export async function getOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const order = await Order.findById(orderId(req))
      .select('+opsNotes')
      .populate('buyerId', 'name phone')
      .populate('supplierId', 'businessName whatsappNumber userId')
      .populate('driverId', 'name phone')
      .lean();
    if (!order) throw AppError.notFound('Order');
    res.json(ok(order));
  } catch (err) { next(err); }
}

// POST /ops/orders/:id/cancel — any status before DELIVERED. After pickup, ops must say
// whether the goods went back into stock; before pickup stock is always restored.
export async function cancel(req: Request, res: Response, next: NextFunction) {
  try {
    const id = orderId(req);
    const { reason, restock } = req.body as { reason: string; restock?: boolean };
    const { userId, role } = opsActor(req);

    const current = await Order.findById(id).select('status').lean();
    if (!current) throw AppError.notFound('Order');
    const goodsLeftSupplier = ['PICKED_UP', 'IN_TRANSIT'].includes(current.status);
    if (goodsLeftSupplier && restock === undefined) {
      throw AppError.badRequest('The goods have left the supplier — set restock to true if they were returned, false if not');
    }

    const { order, changed } = await cancelOrder({
      filter: { _id: id },
      actor: 'OPS',
      historyRole: role,
      userId,
      reason,
      restock: restock ?? true,
      // Defaulted restock is only safe if the order hasn't been picked up in the meantime
      guard: restock === undefined ? { status: { $nin: ['PICKED_UP', 'IN_TRANSIT'] } } : {},
    });

    if (changed) {
      await withOpsNote(id, req, `Cancelled (${restock ?? true ? 'restocked' : 'not restocked'}): ${reason}`);
      notifyUser(order.buyerId.toString(), {
        title: '❌ Order Cancelled',
        body: `Your order ${order.orderNumber} was cancelled by BuildX support.`,
        data: { screen: 'buyer_orders', orderId: id },
      });
    }
    res.json(ok(order));
  } catch (err) { next(err); }
}

// POST /ops/orders/:id/unassign — driver no-show: ASSIGNED → READY_FOR_PICKUP, driver removed
export async function unassign(req: Request, res: Response, next: NextFunction) {
  try {
    const id = orderId(req);
    const { userId, role } = opsActor(req);
    const before = await Order.findById(id).select('driverId').lean();
    const { order, changed } = await transitionOrder({
      filter: { _id: id },
      to: 'READY_FOR_PICKUP',
      actor: 'OPS',
      mode: 'PLATFORM',
      userId,
      historyRole: role,
      unset: ['driverId', 'assignedAt'],
      note: req.body.reason,
    });
    if (changed) {
      await withOpsNote(id, req, `Driver unassigned: ${req.body.reason}`);
      if (before?.driverId) {
        notifyUser(before.driverId.toString(), {
          title: 'Order reassigned',
          body: `Order ${order.orderNumber} has been removed from your deliveries by BuildX support.`,
          data: { screen: 'driver_available', orderId: id },
        });
      }
    }
    res.json(ok(order));
  } catch (err) { next(err); }
}

// POST /ops/orders/:id/assign — give a READY_FOR_PICKUP order to a specific delivery partner
export async function assign(req: Request, res: Response, next: NextFunction) {
  try {
    const id = orderId(req);
    const { driverUserId, note } = req.body as { driverUserId: string; note?: string };
    const { userId, role } = opsActor(req);

    const [driverUser, driverProfile] = await Promise.all([
      User.findById(driverUserId).select('role isActive').lean(),
      DeliveryPartner.findOne({ userId: driverUserId }).select('_id').lean(),
    ]);
    if (!driverUser || driverUser.role !== 'DELIVERY_PARTNER' || !driverProfile) {
      throw AppError.badRequest('That user is not an onboarded delivery partner');
    }
    if (!driverUser.isActive) throw AppError.badRequest('That delivery partner account is suspended');
    if (!(await Order.exists({ _id: id }))) throw AppError.notFound('Order');

    const { order, changed } = await transitionOrder({
      filter: { _id: id, driverId: { $exists: false } },
      to: 'ASSIGNED',
      actor: 'OPS',
      mode: 'PLATFORM',
      userId,
      historyRole: role,
      set: { driverId: new Types.ObjectId(driverUserId), assignedAt: new Date(), deliveryMode: 'PLATFORM' },
      note,
    }).catch(async (err) => {
      // Already assigned to this very driver → idempotent
      const same = await Order.findOne({ _id: id, driverId: driverUserId, status: 'ASSIGNED' }).lean();
      if (same) return { order: same, changed: false };
      throw err instanceof AppError && err.statusCode === 404 ? AppError.conflict('Order already has a driver') : err;
    });

    if (changed) {
      await withOpsNote(id, req, `Assigned to driver ${driverUserId}${note ? `: ${note}` : ''}`);
      notifyUser(driverUserId, {
        title: '📦 New delivery assigned',
        body: `BuildX support assigned order ${order.orderNumber} to you.`,
        data: { screen: 'driver_available', orderId: id },
      });
      notifyUser(order.buyerId.toString(), {
        title: '🚚 Driver Assigned',
        body: `A driver is on the way to pick up your order ${order.orderNumber}.`,
        data: { screen: 'buyer_orders', orderId: id },
      });
    }
    res.json(ok(order));
  } catch (err) { next(err); }
}

// POST /ops/orders/:id/cod — record cash actually received (full → CAPTURED, short → PARTIAL)
export async function recordCod(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId, role } = opsActor(req);
    const { order } = await recordCodByOps({
      orderId: orderId(req),
      amount: req.body.amount,
      note: req.body.note,
      opsUserId: userId,
      opsRole: role,
    });
    res.json(ok(order));
  } catch (err) { next(err); }
}

// POST /ops/orders/:id/notes — internal note (not visible to buyer/supplier/driver)
export async function addNote(req: Request, res: Response, next: NextFunction) {
  try {
    const order = await withOpsNote(orderId(req), req, req.body.note);
    if (!order) throw AppError.notFound('Order');
    res.status(201).json(ok(order));
  } catch (err) { next(err); }
}

// ─── Drivers, suppliers, accounts ───────────────────────────────────────────

// GET /ops/drivers — delivery partners with availability and current load
export async function listDrivers(_req: Request, res: Response, next: NextFunction) {
  try {
    const [drivers, load] = await Promise.all([
      DeliveryPartner.find().populate('userId', 'name phone isActive').sort({ isAvailable: -1 }).limit(200).lean(),
      Order.aggregate([
        { $match: { status: { $in: ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'] }, driverId: { $exists: true }, ...modeFilter('PLATFORM') } },
        { $group: { _id: '$driverId', active: { $sum: 1 } } },
      ]),
    ]);
    const activeBy = new Map(load.map((l) => [l._id.toString(), l.active]));
    res.json(ok(drivers.map((d) => {
      const user = d.userId as unknown as { _id: Types.ObjectId } | null;
      return { ...d, activeOrders: user ? activeBy.get(user._id.toString()) ?? 0 : 0 };
    })));
  } catch (err) { next(err); }
}

// GET /ops/suppliers?verification=PENDING
export async function listSuppliers(req: Request, res: Response, next: NextFunction) {
  try {
    const { verification } = req.query as { verification?: string };
    const suppliers = await SupplierProfile.find(verification ? { verificationStatus: verification } : {})
      .populate('userId', 'name phone isActive')
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
    res.json(ok(suppliers));
  } catch (err) { next(err); }
}

// PATCH /ops/suppliers/:id/verification — approve or reject a supplier
export async function setSupplierVerification(req: Request, res: Response, next: NextFunction) {
  try {
    const id = String(req.params.id);
    if (!isValidObjectId(id)) throw AppError.badRequest('Invalid supplier ID');
    const { status, note } = req.body as { status: 'VERIFIED' | 'REJECTED'; note?: string };
    const profile = await SupplierProfile.findByIdAndUpdate(id, { verificationStatus: status }, { new: true }).lean();
    if (!profile) throw AppError.notFound('Supplier');
    logger.info('[ops] supplier verification', { opsUserId: req.auth!.userId, supplierId: id, status, note });
    notifyUser(profile.userId.toString(), {
      title: status === 'VERIFIED' ? '✓ You are verified on BuildX' : 'Verification update',
      body: status === 'VERIFIED'
        ? 'Buyers will now see the Verified badge on your products.'
        : `Your verification was not approved.${note ? ` ${note}` : ''} Contact BuildX support.`,
      data: { screen: 'supplier_orders' },
    });
    res.json(ok(profile));
  } catch (err) { next(err); }
}

// PATCH /ops/users/:id/active — ADMIN only: suspend/reinstate an account
export async function setUserActive(req: Request, res: Response, next: NextFunction) {
  try {
    const id = String(req.params.id);
    if (!isValidObjectId(id)) throw AppError.badRequest('Invalid user ID');
    if (id === req.auth!.userId) throw AppError.forbidden("You can't change your own account status");
    const { isActive, reason } = req.body as { isActive: boolean; reason: string };

    const user = await User.findOneAndUpdate(
      { _id: id, role: { $ne: 'ADMIN' } }, // admins can't be suspended through the API
      { isActive },
      { new: true }
    ).select('name phone role isActive').lean();
    if (!user) throw AppError.notFound('User (or user is an admin)');
    logger.info('[ops] user active changed', { adminUserId: req.auth!.userId, userId: id, isActive, reason });
    res.json(ok(user));
  } catch (err) { next(err); }
}
