import { Request, Response, NextFunction } from 'express';
import { User } from '../../infrastructure/database/models/User.model';
import { SupplierProfile } from '../../infrastructure/database/models/SupplierProfile.model';
import { AppError } from '../../shared/errors/AppError';
import { ok } from '@buildx/shared';

export class AuthController {
  // POST /auth/sync — called immediately after Firebase OTP verified
  // Creates the user in MongoDB if first time, or returns existing user
  async sync(req: Request, res: Response, next: NextFunction) {
    try {
      const { uid, phone } = req.auth!;

      let user = await User.findOne({ firebaseUid: uid });

      if (!user) {
        user = await User.create({
          firebaseUid: uid,
          phone,
          name: 'New User',
          role: 'BUYER',
          onboardingComplete: false,
        });
      }

      res.json(
        ok({
          id: user._id,
          phone: user.phone,
          name: user.name,
          role: user.role,
          onboardingComplete: user.onboardingComplete,
        })
      );
    } catch (err) {
      next(err);
    }
  }

  // POST /auth/onboard — set name, role, supplier profile
  async onboard(req: Request, res: Response, next: NextFunction) {
    try {
      const { uid } = req.auth!;
      const { name, role, businessName, whatsappNumber, deliveryRadiusKm, serviceAreas } = req.body;

      const user = await User.findOne({ firebaseUid: uid });
      if (!user) throw AppError.notFound('User');
      if (user.onboardingComplete) throw AppError.conflict('Onboarding already complete');

      user.name = name;
      user.role = role;
      user.onboardingComplete = true;
      await user.save();

      if (role === 'SUPPLIER') {
        if (!businessName || !whatsappNumber) {
          throw AppError.badRequest('businessName and whatsappNumber required for suppliers');
        }
        await SupplierProfile.create({
          userId: user._id,
          businessName,
          whatsappNumber,
          deliveryRadiusKm: deliveryRadiusKm ?? 30,
          serviceAreas: serviceAreas ?? [],
          verificationStatus: 'PENDING',
        });
      }

      res.json(
        ok({
          id: user._id,
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
