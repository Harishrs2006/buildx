import { Request, Response, NextFunction } from 'express';
import { User } from '../../infrastructure/database/models/User.model';
import { SupplierProfile } from '../../infrastructure/database/models/SupplierProfile.model';
import { DeliveryPartner } from '../../infrastructure/database/models/DeliveryPartner.model';
import { AppError } from '../../shared/errors/AppError';
import { ok } from '@buildx/shared';

export class AuthController {
  // POST /auth/sync — called immediately after Firebase OTP verified
  // Creates the user in MongoDB if first time, or returns existing user
  async sync(req: Request, res: Response, next: NextFunction) {
    try {
      const { uid, phone } = req.auth!;

      const user = await User.findOneAndUpdate(
        { firebaseUid: uid },
        {
          $setOnInsert: {
            firebaseUid: uid,
            phone,
            name: 'New User',
            role: 'BUYER',
            onboardingComplete: false,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

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
      const { name, role, businessName, whatsappNumber, deliveryRadiusKm, serviceAreas, vehicleType, vehicleNumber, licenseNumber } = req.body;

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

      if (role === 'DELIVERY_PARTNER') {
        if (!vehicleType || !vehicleNumber || !licenseNumber) {
          throw AppError.badRequest('vehicleType, vehicleNumber, licenseNumber required for delivery partners');
        }
        await DeliveryPartner.create({
          userId: user._id,
          vehicleType,
          vehicleNumber: vehicleNumber.trim().toUpperCase(),
          licenseNumber: licenseNumber.trim().toUpperCase(),
          serviceAreas: serviceAreas ?? [],
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
