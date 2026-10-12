import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { validate } from '../../shared/middleware/validate.middleware';
import { AppError } from '../../shared/errors/AppError';
import { getPincode, reverse } from './locations.controller';

// Public (buyers pick a location before signing in), so rate-limited per IP. Reverse lookups
// call a paid provider and get a tighter limit.
const limiter = (max: number, message: string) =>
  rateLimit({
    windowMs: 60 * 1000,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, _res, next) => next(AppError.tooManyRequests(message)),
  });

const reverseSchema = z.object({
  lat: z.number().finite().min(-90).max(90),
  lng: z.number().finite().min(-180).max(180),
});

// A factory so each app instance gets its own limiter state
export function createLocationRoutes() {
  const router = Router();
  router.get('/pincode/:pincode', limiter(60, 'Too many PIN code lookups. Please wait a minute.'), getPincode);
  router.post('/reverse', limiter(10, 'Too many location requests. Please wait a minute.'), validate(reverseSchema), reverse);
  return router;
}
