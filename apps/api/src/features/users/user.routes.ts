import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../shared/middleware/auth.middleware';
import { validate } from '../../shared/middleware/validate.middleware';
import { getAuth } from 'firebase-admin/auth';
import { User } from '../../infrastructure/database/models/User.model';
import { Order } from '../../infrastructure/database/models/Order.model';
import { Product } from '../../infrastructure/database/models/Product.model';
import { SupplierProfile } from '../../infrastructure/database/models/SupplierProfile.model';
import { AppError } from '../../shared/errors/AppError';
import { logger } from '../../shared/logger/logger';
import { ok } from '@sthiva/shared';

const router = Router();

// All routes act only on the caller's own document (req.auth.userId) — never a client-supplied ID.

const updateMeSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  preferredLanguage: z.enum(['en', 'kn', 'hi', 'te']).optional(),
});

const addressSchema = z.object({
  label: z.string().trim().min(1).max(50),
  fullAddress: z.string().trim().min(5).max(500),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  contactPhone: z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
  isDefault: z.boolean().default(false),
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.auth!.userId).select('-__v').lean();
    res.json(ok(user));
  } catch (err) { next(err); }
});

router.patch('/me', requireAuth, validate(updateMeSchema), async (req, res, next) => {
  try {
    const { name, preferredLanguage } = req.body;
    const user = await User.findByIdAndUpdate(
      req.auth!.userId,
      { ...(name && { name }), ...(preferredLanguage && { preferredLanguage }) },
      { new: true, select: '-__v' }
    ).lean();
    res.json(ok(user));
  } catch (err) { next(err); }
});

router.patch('/me/fcm-token', requireAuth, async (req, res, next) => {
  try {
    const { token } = req.body as { token: string };
    if (!token) { res.status(400).json({ success: false, error: { message: 'token required' } }); return; }
    await User.findByIdAndUpdate(req.auth!.userId, { fcmToken: token });
    res.json(ok({ updated: true }));
  } catch (err) { next(err); }
});

router.post('/me/addresses', requireAuth, validate(addressSchema), async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.auth!.userId,
      { $push: { addresses: req.body } },
      { new: true, select: 'addresses' }
    ).lean();
    res.status(201).json(ok(user?.addresses));
  } catch (err) { next(err); }
});

// DELETE /users/me: account deletion, required by Google Play and the App Store and promised in the
// privacy policy. Personal details are erased and the Firebase login is deleted, so the same phone or
// Google account can sign up again as a new user. Orders stay, with no contact details on the user,
// because invoices and tax records must be kept. Staff and driver accounts are closed by ops instead.
const OPEN_ORDER_STATUSES = ['PENDING', 'CONFIRMED', 'READY_FOR_PICKUP', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DISPUTED'];

router.delete('/me', requireAuth, async (req, res, next) => {
  try {
    const { userId, role, uid } = req.auth!;
    if (role !== 'BUYER' && role !== 'SUPPLIER') {
      throw AppError.forbidden('This account is closed by Sthiva support. Please contact them.');
    }

    const profile = role === 'SUPPLIER' ? await SupplierProfile.findOne({ userId }).select('_id').lean() : null;
    const openOrders = await Order.countDocuments({
      status: { $in: OPEN_ORDER_STATUSES },
      $or: [{ buyerId: userId }, ...(profile ? [{ supplierId: profile._id }] : [])],
    });
    if (openOrders > 0) {
      throw AppError.conflict(
        `You have ${openOrders} open order${openOrders === 1 ? '' : 's'}. Finish or cancel ${openOrders === 1 ? 'it' : 'them'} before deleting your account.`
      );
    }

    if (profile) {
      await Product.updateMany({ supplierId: profile._id }, { status: 'DISCONTINUED' });
      await SupplierProfile.updateOne({ _id: profile._id }, { isActive: false });
    }
    await User.updateOne(
      { _id: userId },
      {
        $set: { name: 'Deleted user', isActive: false, firebaseUid: `deleted:${userId}`, addresses: [], deletedAt: new Date() },
        $unset: { phone: 1, email: 1, fcmToken: 1, gstNumber: 1, bankAccount: 1, avatarUrl: 1 },
      }
    );

    try {
      await getAuth().deleteUser(uid);
    } catch (err) {
      // Already gone in Firebase is fine; anything else is logged; our records are already erased
      if ((err as { code?: string })?.code !== 'auth/user-not-found') {
        logger.error('[account-deletion] Firebase user not deleted', { userId, code: (err as { code?: string })?.code });
      }
    }

    res.json(ok({ deleted: true }));
  } catch (err) { next(err); }
});

export { router as userRoutes };
