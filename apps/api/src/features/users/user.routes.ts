import { Router } from 'express';
import { requireAuth } from '../../shared/middleware/auth.middleware';
import { User } from '../../infrastructure/database/models/User.model';
import { ok } from '@buildx/shared';

const router = Router();

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.auth!.userId).select('-__v').lean();
    res.json(ok(user));
  } catch (err) { next(err); }
});

router.patch('/me', requireAuth, async (req, res, next) => {
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

router.post('/me/addresses', requireAuth, async (req, res, next) => {
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
