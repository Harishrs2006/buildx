import { Request, Response, NextFunction } from 'express';
import { getAuth } from 'firebase-admin/auth';
import { AppError } from '../errors/AppError';
import { User } from '../../infrastructure/database/models/User.model';

declare global {
  namespace Express {
    interface Request {
      auth?: {
        uid: string;
        phone: string;
        userId: string;
        role: string;
      };
    }
  }
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw AppError.unauthorized('Missing or invalid Authorization header');
    }

    const token = authHeader.slice(7);
    const decoded = await getAuth().verifyIdToken(token);

    const user = await User.findOne({ firebaseUid: decoded.uid }).select('_id role phone').lean();
    if (!user) throw AppError.unauthorized('User not found. Please complete onboarding.');
    if (!user.isActive) throw AppError.forbidden('Account suspended. Contact support.');

    req.auth = {
      uid: decoded.uid,
      phone: decoded.phone_number ?? '',
      userId: user._id.toString(),
      role: user.role,
    };

    next();
  } catch (err: any) {
    if (err.isOperational) return next(err);
    // Firebase token errors
    if (err.code?.startsWith('auth/')) {
      return next(AppError.unauthorized('Invalid or expired token'));
    }
    next(err);
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) return next(AppError.unauthorized('Not authenticated'));
    if (!roles.includes(req.auth.role)) {
      return next(AppError.forbidden(`Requires role: ${roles.join(' or ')}`));
    }
    next();
  };
}
