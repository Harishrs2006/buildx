import { Request, Response, NextFunction } from 'express';
import { getAuth } from 'firebase-admin/auth';
import type { UserRole } from '@buildx/shared';
import { AppError } from '../errors/AppError';
import { User } from '../../infrastructure/database/models/User.model';

declare global {
  namespace Express {
    interface Request {
      // Set by verifyFirebaseToken — identity proven by Firebase, may not exist in our DB yet
      firebase?: {
        uid: string;
        phone: string;
      };
      // Set by requireAuth — an active user that exists in our DB
      auth?: {
        uid: string;
        phone: string;
        userId: string;
        role: UserRole;
      };
    }
  }
}

function mapAuthError(err: any): unknown {
  if (err?.isOperational) return err;
  // Firebase token errors: malformed, expired, revoked, or the Firebase account is disabled
  if (typeof err?.code === 'string' && err.code.startsWith('auth/')) {
    return AppError.unauthorized('Invalid or expired token');
  }
  return err;
}

// Verifies the Firebase ID token only. Used by /auth/sync, where a first-time
// user is authenticated by Firebase but has no MongoDB record yet.
export async function verifyFirebaseToken(req: Request, _res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw AppError.unauthorized('Missing or invalid Authorization header');
    }

    const token = authHeader.slice(7);
    // checkRevoked: also rejects revoked sessions and accounts disabled in Firebase
    const decoded = await getAuth().verifyIdToken(token, true);

    // BuildX identities are phone-OTP only — a token without a verified phone is not one of ours
    if (!decoded.phone_number) {
      throw AppError.unauthorized('Phone number verification required');
    }

    req.firebase = { uid: decoded.uid, phone: decoded.phone_number };
    next();
  } catch (err) {
    next(mapAuthError(err));
  }
}

// Verifies the token AND requires an active MongoDB user. Role always comes from our DB.
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  verifyFirebaseToken(req, res, async (err?: unknown) => {
    if (err) return next(err);
    try {
      const { uid, phone } = req.firebase!;
      const user = await User.findOne({ firebaseUid: uid }).select('_id role isActive').lean();
      if (!user) throw AppError.unauthorized('User not found. Please sign in again.');
      if (!user.isActive) throw AppError.forbidden('Account suspended. Contact support.');

      req.auth = { uid, phone, userId: user._id.toString(), role: user.role };
      next();
    } catch (e) {
      next(mapAuthError(e));
    }
  });
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) return next(AppError.unauthorized('Not authenticated'));
    if (!roles.includes(req.auth.role)) {
      return next(AppError.forbidden(`Requires role: ${roles.join(' or ')}`));
    }
    next();
  };
}
