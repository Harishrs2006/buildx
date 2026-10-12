import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../shared/middleware/auth.middleware';
import { validate } from '../../shared/middleware/validate.middleware';
import { User } from '../../infrastructure/database/models/User.model';
import { ok } from '@buildx/shared';

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

export { router as userRoutes };
