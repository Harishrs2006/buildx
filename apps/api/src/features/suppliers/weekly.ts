// Weekly availability (owner decision 2026-11-05). Once a week each supplier goes through everything they
// list and confirms how much they can supply and at what price, in one step. Suppliers who have not
// confirmed get a reminder on Monday morning. Nothing is paused automatically: ops sees who is behind.
//
// Weeks start Monday 00:00 India time (IST, UTC+5:30).

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ok } from '@sthiva/shared';
import { Product } from '../../infrastructure/database/models/Product.model';
import { SupplierProfile } from '../../infrastructure/database/models/SupplierProfile.model';
import { AppError } from '../../shared/errors/AppError';
import { logger } from '../../shared/logger/logger';
import { notifyUser } from '../../shared/services/notification.service';
import { bulkPricingProblem } from './product-rules';

const IST_MS = (5 * 60 + 30) * 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;
export const REMINDER_HOUR_IST = 9;

/** Monday 00:00 IST of the week `now` falls in, as a UTC instant. */
export function weekStart(now = new Date()): Date {
  const ist = new Date(now.getTime() + IST_MS);
  const daysSinceMonday = (ist.getUTCDay() + 6) % 7;
  const mondayIst = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()) - daysSinceMonday * DAY;
  return new Date(mondayIst - IST_MS);
}

const LISTED = ['ACTIVE', 'OUT_OF_STOCK'];

export const weeklyConfirmSchema = z.object({
  items: z.array(z.object({
    productId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid product ID'),
    stockQuantity: z.number().int().min(0).max(10_000_000),
    basePrice: z.number().positive().max(10_000_000).multipleOf(0.01, 'Use at most 2 decimals'),
  })).min(1).max(500),
});

async function profileFor(userId: string) {
  const profile = await SupplierProfile.findOne({ userId }).select('_id weeklyConfirmedAt canDeliver').lean();
  if (!profile) throw AppError.notFound('Supplier profile');
  return profile;
}

// GET /suppliers/me/weekly — this week's check: every listed item with its quantity and price
export async function getWeekly(req: Request, res: Response, next: NextFunction) {
  try {
    const profile = await profileFor(req.auth!.userId);
    const items = await Product.find({ supplierId: profile._id, status: { $in: LISTED } })
      .select('name unit stockQuantity basePrice status minOrderQuantity')
      .sort({ name: 1 }).lean();
    const start = weekStart();
    res.json(ok({
      weekStart: start,
      confirmedAt: profile.weeklyConfirmedAt ?? null,
      confirmedThisWeek: !!profile.weeklyConfirmedAt && profile.weeklyConfirmedAt >= start,
      canDeliver: profile.canDeliver ?? false,
      items,
    }));
  } catch (err) { next(err); }
}

// POST /suppliers/me/weekly { items: [{ productId, stockQuantity, basePrice }] } — confirms the whole list
export async function confirmWeekly(req: Request, res: Response, next: NextFunction) {
  try {
    const profile = await profileFor(req.auth!.userId);
    const { items } = req.body as z.infer<typeof weeklyConfirmSchema>;
    const listed = await Product.find({ supplierId: profile._id, status: { $in: LISTED } })
      .select('status basePrice minOrderQuantity bulkPricing name').lean();
    const byId = new Map(listed.map((p) => [String(p._id), p]));

    // Every listed item must be in the confirmation, and nothing else
    const sent = new Set(items.map((i) => i.productId));
    if (sent.size !== items.length) throw AppError.badRequest('Each item can appear only once');
    const unknown = items.filter((i) => !byId.has(i.productId));
    if (unknown.length) throw AppError.badRequest('Some items are not in your list any more. Refresh and try again.');
    const missing = listed.filter((p) => !sent.has(String(p._id)));
    if (missing.length) throw AppError.badRequest(`Confirm every item. Missing: ${missing.map((p) => p.name).slice(0, 3).join(', ')}${missing.length > 3 ? '…' : ''}`);

    // Check every price against its bulk tiers before changing anything
    const problems = items.flatMap((i) => {
      const p = byId.get(i.productId)!;
      const problem = bulkPricingProblem(p.bulkPricing ?? [], i.basePrice, p.minOrderQuantity ?? 1);
      return problem ? [{ field: i.productId, message: `${p.name}: ${problem}` }] : [];
    });
    if (problems.length) throw AppError.badRequest('Validation failed', problems);

    const now = new Date();
    await Product.bulkWrite(items.map((i) => {
      const p = byId.get(i.productId)!;
      // Stock drives availability, as on the product page: 0 is out of stock, restocking brings it back
      const status = i.stockQuantity <= 0 && p.status === 'ACTIVE' ? 'OUT_OF_STOCK'
        : i.stockQuantity > 0 && p.status === 'OUT_OF_STOCK' ? 'ACTIVE' : p.status;
      return {
        updateOne: {
          filter: { _id: p._id, supplierId: profile._id, status: { $in: LISTED } },
          update: { $set: { stockQuantity: i.stockQuantity, basePrice: i.basePrice, status, availabilityConfirmedAt: now } },
        },
      };
    }));
    await SupplierProfile.updateOne({ _id: profile._id }, { $set: { weeklyConfirmedAt: now } });
    logger.info('[weekly] confirmed', { supplierId: String(profile._id), items: items.length });
    res.json(ok({ confirmedAt: now, items: items.length }));
  } catch (err) { next(err); }
}

/**
 * Monday from 09:00 IST: one reminder per week to verified, active suppliers who have something listed
 * and have not confirmed this week. Safe to call often (runs in the one-minute sweeper).
 */
export async function sendWeeklyReminders(now = new Date()) {
  const start = weekStart(now);
  if (now.getTime() < start.getTime() + REMINDER_HOUR_IST * 60 * 60 * 1000) return 0;
  if (now.getTime() >= start.getTime() + DAY) return 0; // Mondays only; a missed Monday is not chased later
  const due = await SupplierProfile.find({
    verificationStatus: 'VERIFIED',
    isActive: { $ne: false },
    $and: [
      { $or: [{ weeklyConfirmedAt: { $exists: false } }, { weeklyConfirmedAt: { $lt: start } }] },
      { $or: [{ weeklyReminderFor: { $exists: false } }, { weeklyReminderFor: { $lt: start } }] },
    ],
  }).select('_id userId').limit(500).lean();
  let sent = 0;
  for (const s of due) {
    // Claim first so two servers never send the same reminder twice
    const claimed = await SupplierProfile.updateOne(
      { _id: s._id, $or: [{ weeklyReminderFor: { $exists: false } }, { weeklyReminderFor: { $lt: start } }] },
      { $set: { weeklyReminderFor: start } }
    );
    if (!claimed.modifiedCount) continue;
    if (!(await Product.exists({ supplierId: s._id, status: { $in: LISTED } }))) continue;
    notifyUser(String(s.userId), {
      title: 'Weekly check: confirm your stock and prices',
      body: 'Tell Sthiva what you can supply this week. It takes a minute on the Weekly check page.',
      data: { screen: 'supplier_weekly' },
    });
    sent++;
  }
  if (sent) logger.info('[weekly] reminders sent', { sent });
  return sent;
}
