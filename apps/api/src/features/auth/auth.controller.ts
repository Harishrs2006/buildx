import { Request, Response, NextFunction } from 'express';
import { User } from '../../infrastructure/database/models/User.model';
import { SupplierProfile } from '../../infrastructure/database/models/SupplierProfile.model';
import { DeliveryPartner } from '../../infrastructure/database/models/DeliveryPartner.model';
import { AppError } from '../../shared/errors/AppError';
import { ok } from '@buildx/shared';
import type { OnboardInput } from './auth.routes';

export class AuthController {
  // POST /auth/sync — called immediately after Firebase OTP verified
  // Creates the user in MongoDB if first time, or returns existing user.
  // Identity (uid + phone) comes only from the verified Firebase token; the body is ignored.
  async sync(req: Request, res: Response, next: NextFunction) {
    try {
      const { uid, phone, email, name } = req.firebase!;
      const googleName = name?.trim().slice(0, 100);

      const user = await User.findOneAndUpdate(
        { firebaseUid: uid },
        {
          $setOnInsert: {
            firebaseUid: uid,
            ...(phone ? { phone } : {}),
            ...(email ? { email } : {}),
            name: googleName && googleName.length >= 2 ? googleName : 'New User',
            role: 'BUYER',
            onboardingComplete: false,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      this.sendSynced(user, res);
    } catch (err: any) {
      if (err?.code === 11000) {
        // Concurrent first syncs (double tap, client retry) race to insert the same user and the
        // loser hits a duplicate key. If this Firebase account exists now, that was the race.
        try {
          const existing = await User.findOne({ firebaseUid: req.firebase!.uid });
          if (existing) return this.sendSynced(existing, res);
        } catch (lookupErr) {
          return next(lookupErr);
        }
        // Otherwise the phone or email is linked to a different Firebase account (e.g. account re-created)
        return next(
          AppError.conflict(
            req.firebase!.phone
              ? 'This phone number is already linked to another account. Contact support.'
              : 'This Google account is already linked to another BuildX account. Contact support.'
          )
        );
      }
      next(err);
    }
  }

  private sendSynced(user: { _id: unknown; phone?: string; email?: string; name: string; role: string; onboardingComplete: boolean; isActive: boolean }, res: Response) {
    if (!user.isActive) throw AppError.forbidden('Account suspended. Contact support.');
    res.json(
      ok({
        id: user._id,
        phone: user.phone,
        email: user.email,
        name: user.name,
        role: user.role,
        onboardingComplete: user.onboardingComplete,
      })
    );
  }

  // POST /auth/onboard — set name, role and the role's profile.
  // Ordered so a failure at any step leaves the user NOT onboarded and the call can be retried:
  //   1. upsert the role profile (idempotent, unique per userId)
  //   2. atomically flip the user to onboarded — only succeeds once
  //   3. remove stale profiles left by an abandoned attempt with a different role
  async onboard(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.auth!;
      const body = req.body as OnboardInput;

      const existing = await User.findById(userId).select('onboardingComplete').lean();
      if (!existing) throw AppError.notFound('User');
      if (existing.onboardingComplete) throw AppError.conflict('Onboarding already complete');

      const profileOpts = { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true };

      if (body.role === 'SUPPLIER') {
        await SupplierProfile.findOneAndUpdate(
          { userId },
          {
            $set: {
              businessName: body.businessName,
              whatsappNumber: body.whatsappNumber,
              deliveryRadiusKm: body.deliveryRadiusKm ?? 30,
              serviceAreas: body.serviceAreas ?? [],
            },
            $setOnInsert: { verificationStatus: 'PENDING' },
          },
          profileOpts
        );
      }

      if (body.role === 'DELIVERY_PARTNER') {
        await DeliveryPartner.findOneAndUpdate(
          { userId },
          {
            $set: {
              vehicleType: body.vehicleType,
              vehicleNumber: body.vehicleNumber,
              licenseNumber: body.licenseNumber,
              serviceAreas: body.serviceAreas ?? [],
            },
          },
          profileOpts
        );
      }

      const user = await User.findOneAndUpdate(
        { _id: userId, onboardingComplete: false },
        { $set: { name: body.name, role: body.role, onboardingComplete: true } },
        { new: true, runValidators: true }
      ).lean();
      if (!user) throw AppError.conflict('Onboarding already complete');

      if (body.role !== 'SUPPLIER') await SupplierProfile.deleteOne({ userId });
      if (body.role !== 'DELIVERY_PARTNER') await DeliveryPartner.deleteOne({ userId });

      res.json(
        ok({
          id: user._id,
          phone: user.phone,
          email: user.email,
          name: user.name,
          role: user.role,
          onboardingComplete: true,
        })
      );
    } catch (err) {
      next(err);
    }
  }
}

export const authController = new AuthController();
