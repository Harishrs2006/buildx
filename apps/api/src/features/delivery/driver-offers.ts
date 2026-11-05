// Sthiva delivery jobs are offered to one driver at a time (owner decision 2026-11-05), and ops can
// assign or reassign anyone at any point.
//
//   READY_FOR_PICKUP, driverOffer OFFERED ──driver accepts──▶ ASSIGNED (driverOffer ASSIGNED)
//                                         ──declines / answer time runs out──▶ next driver
//                                         └▶ nobody left: driverOffer NEEDS_OPS (ops "No driver" queue)
//
// A suitable driver: verified, account active, on duty, vehicle type whose capacity (Settings →
// Delivery vehicles) carries the order weight when both are known, and not offered this job before.
// Order: smallest suitable vehicle first, then fewest jobs in hand. (No driver GPS yet, so not
// "nearest": that needs a new app build with location permission.)

import { Types } from 'mongoose';
import { Order, IOrder } from '../../infrastructure/database/models/Order.model';
import { DeliveryPartner, isDriverVerified } from '../../infrastructure/database/models/DeliveryPartner.model';
import { User } from '../../infrastructure/database/models/User.model';
import { VehicleType } from '../../infrastructure/database/models/VehicleType.model';
import { getPlatformSettings } from '../../infrastructure/database/models/PlatformSettings.model';
import { AppError } from '../../shared/errors/AppError';
import { logger } from '../../shared/logger/logger';
import { notifyUser } from '../../shared/services/notification.service';

type LeanOrder = IOrder & { _id: Types.ObjectId };
type Outcome = 'DECLINED' | 'EXPIRED' | 'WITHDRAWN';

async function driverOfferExpiry(from: Date): Promise<Date | undefined> {
  const minutes = (await getPlatformSettings())?.driverOfferTimeoutMinutes;
  return minutes ? new Date(from.getTime() + minutes * 60_000) : undefined;
}

/** Suitable drivers for an order, best first. */
export async function rankDrivers(order: Pick<LeanOrder, 'delivery' | 'driverOffer'>): Promise<Types.ObjectId[]> {
  const tried = new Set((order.driverOffer?.attempts ?? []).map((a) => a.driverUserId.toString()));
  const [drivers, vehicles] = await Promise.all([
    DeliveryPartner.find({ isAvailable: true }).select('userId vehicleType verificationStatus').lean(),
    VehicleType.find({}).select('code maxLoadKg').lean(),
  ]);
  const capacity = new Map(vehicles.map((v) => [v.code, v.maxLoadKg]));
  const weight = order.delivery?.weightKg;
  const candidates = drivers.filter((d) => {
    if (!isDriverVerified(d) || tried.has(d.userId.toString())) return false;
    const cap = capacity.get(d.vehicleType);
    return weight === undefined || cap === undefined || cap >= weight;
  });
  if (!candidates.length) return [];

  const ids = candidates.map((d) => d.userId);
  const [active, load] = await Promise.all([
    User.find({ _id: { $in: ids }, isActive: true, role: 'DELIVERY_PARTNER' }).select('_id').lean(),
    Order.aggregate<{ _id: Types.ObjectId; n: number }>([
      { $match: { driverId: { $in: ids }, status: { $in: ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'] } } },
      { $group: { _id: '$driverId', n: { $sum: 1 } } },
    ]),
  ]);
  const ok = new Set(active.map((u) => u._id.toString()));
  const jobs = new Map(load.map((l) => [l._id.toString(), l.n]));
  return candidates
    .filter((d) => ok.has(d.userId.toString()))
    .sort((a, b) =>
      (capacity.get(a.vehicleType) ?? Infinity) - (capacity.get(b.vehicleType) ?? Infinity)
      || (jobs.get(a.userId.toString()) ?? 0) - (jobs.get(b.userId.toString()) ?? 0))
    .map((d) => d.userId);
}

function notifyDriver(order: LeanOrder, driverUserId: Types.ObjectId) {
  const minutes = order.driverOffer?.expiresAt ? Math.round((order.driverOffer.expiresAt.getTime() - Date.now()) / 60000) : null;
  notifyUser(driverUserId.toString(), {
    title: 'New delivery job',
    body: `Order ${order.orderNumber}${order.delivery ? `: ${order.delivery.weightKg} kg, about ${order.delivery.distanceKm} km` : ''}. Accept or decline${minutes ? ` within ${minutes} min` : ''}.`,
    data: { screen: 'driver_available', orderId: order._id.toString() },
  });
}

/**
 * Closes the open offer (if any) with `outcome` and offers the job to the next suitable driver.
 * `expect` guards against races. Returns null if the order isn't in the expected state.
 */
async function offerNext(orderId: string, expect: Record<string, unknown>, outcome?: Outcome, reason?: string) {
  const order = await Order.findOne({ _id: orderId, status: 'READY_FOR_PICKUP', driverId: { $exists: false }, ...expect }).lean<LeanOrder>();
  if (!order) return null;
  const now = new Date();
  const attempts = (order.driverOffer?.attempts ?? []).map((a) =>
    !a.outcome && order.driverOffer?.state === 'OFFERED' && outcome ? { ...a, outcome, at: now, reason } : a);
  const [next] = await rankDrivers({ ...order, driverOffer: { state: 'OFFERED', attempts } });
  const expiresAt = next ? await driverOfferExpiry(now) : undefined;
  const driverOffer = next
    ? { state: 'OFFERED', driverUserId: next, ...(expiresAt ? { expiresAt } : {}), attempts: [...attempts, { driverUserId: next, offeredAt: now }] }
    : { state: 'NEEDS_OPS', attempts };
  const updated = await Order.findOneAndUpdate(
    { _id: order._id, status: 'READY_FOR_PICKUP', driverId: { $exists: false }, updatedAt: order.updatedAt },
    { $set: { driverOffer } },
    { new: true }
  ).lean<LeanOrder>();
  if (!updated) return null; // changed meanwhile (accepted, assigned by ops, cancelled)
  if (next) notifyDriver(updated, next);
  else logger.warn('[driver-offers] no driver available', { orderId: orderId, orderNumber: order.orderNumber });
  return updated;
}

/** First offer, when the order becomes ready for pickup (supplier dispatch, ops unassign). */
export function startDriverOffers(orderId: string) {
  offerNext(orderId, {}).catch((err) => logger.error('[driver-offers] start failed', { orderId, error: err?.message }));
}

/** Is this job open to this driver? Offered to them, or an older order from before offers. */
export function openToDriverFilter(driverUserId: string) {
  return {
    status: 'READY_FOR_PICKUP',
    driverId: { $exists: false },
    $or: [
      { 'driverOffer.state': 'OFFERED', 'driverOffer.driverUserId': new Types.ObjectId(driverUserId) },
      // Mongoose gives every order an empty driverOffer, so "no offer" means no state
      { 'driverOffer.state': { $exists: false } },
    ],
  };
}

/** Marks the driver's offer accepted (called after the ASSIGNED transition succeeded). */
export async function markAccepted(orderId: string, driverUserId: string) {
  const now = new Date();
  await Order.updateOne(
    { _id: orderId, 'driverOffer.driverUserId': new Types.ObjectId(driverUserId) },
    { $set: { 'driverOffer.state': 'ASSIGNED', 'driverOffer.attempts.$[open].outcome': 'ACCEPTED', 'driverOffer.attempts.$[open].at': now }, $unset: { 'driverOffer.expiresAt': '' } },
    { arrayFilters: [{ 'open.driverUserId': new Types.ObjectId(driverUserId), 'open.outcome': { $exists: false } }] }
  );
}

/** Ops assigned a driver directly: the job is no longer being offered. */
export async function markAssignedByOps(orderId: string) {
  await Order.updateOne({ _id: orderId, 'driverOffer.state': { $exists: true } }, {
    $set: { 'driverOffer.state': 'ASSIGNED' },
    $unset: { 'driverOffer.expiresAt': '', 'driverOffer.driverUserId': '' },
  });
}

/** The driver turns the job down; it goes to the next driver. */
export async function declineJob(orderId: string, driverUserId: string, reason: string) {
  const moved = await offerNext(orderId, { 'driverOffer.state': 'OFFERED', 'driverOffer.driverUserId': new Types.ObjectId(driverUserId) }, 'DECLINED', reason);
  if (!moved) {
    if (!(await Order.exists({ _id: orderId, 'driverOffer.attempts.driverUserId': new Types.ObjectId(driverUserId) }))) throw AppError.notFound('Order');
    throw AppError.conflict('This job is no longer offered to you');
  }
  return moved;
}

/** After ops removes a driver: record it, then offer the job to someone else. */
export async function afterUnassign(orderId: string, removedDriver?: Types.ObjectId | string) {
  if (removedDriver) {
    await Order.updateOne({ _id: orderId }, {
      $push: { 'driverOffer.attempts': { driverUserId: new Types.ObjectId(String(removedDriver)), offeredAt: new Date(), outcome: 'WITHDRAWN', at: new Date(), reason: 'Removed by Sthiva' } },
    });
  }
  startDriverOffers(orderId);
}

/** Moves driver offers whose answer time has passed. Returns how many moved. */
export async function expireDriverOffers(now = new Date()): Promise<number> {
  const due = await Order.find({ status: 'READY_FOR_PICKUP', 'driverOffer.state': 'OFFERED', 'driverOffer.expiresAt': { $lte: now } })
    .select('_id driverOffer.driverUserId').limit(100).lean();
  let moved = 0;
  for (const o of due) {
    try {
      const r = await offerNext(o._id.toString(), { 'driverOffer.state': 'OFFERED', 'driverOffer.driverUserId': o.driverOffer!.driverUserId, 'driverOffer.expiresAt': { $lte: now } }, 'EXPIRED', 'No answer in time');
      if (r) moved++;
    } catch (err: any) {
      logger.error('[driver-offers] expiry failed', { orderId: o._id.toString(), error: err?.message });
    }
  }
  return moved;
}
