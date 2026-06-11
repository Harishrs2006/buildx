import { Request, Response, NextFunction } from 'express';
import { clerkClient, createClerkClient } from '@clerk/clerk-sdk-node';
import { AppError } from '../errors/AppError';
import { env } from '../../config/env';

export type UserRole = 'BUYER' | 'SUPPLIER' | 'ADMIN' | 'SUPER_ADMIN';

declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        orgId?: string;
        role?: UserRole;
        sessionId: string;
      };
    }
  }
}

const clerk = createClerkClient({ secretKey: env.CLERK_SECRET_KEY });

export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractBearerToken(req);
    if (!token) throw AppError.unauthorized('Missing authorization token');

    const payload = await clerk.verifyToken(token);

    req.auth = {
      userId: payload.sub,
      orgId: payload.org_id as string | undefined,
      role: payload.metadata?.role as UserRole | undefined,
      sessionId: payload.sid,
    };

    next();
  } catch (err) {
    if (err instanceof AppError) return next(err);
    next(AppError.unauthorized('Invalid or expired token'));
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth) return next(AppError.unauthorized());

    const userRole = req.auth.role;
    if (!userRole || !roles.includes(userRole)) {
      return next(AppError.forbidden('Insufficient permissions'));
    }

    next();
  };
}

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice(7);
}
