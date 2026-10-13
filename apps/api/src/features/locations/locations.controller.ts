import { Request, Response, NextFunction } from 'express';
import { ok } from '@buildx/shared';
import { AppError } from '../../shared/errors/AppError';
import { lookupPincode, PINCODE_RE, PostalLookupUnavailable, type PostalLookup } from './postal-directory.service';
import { reverseGeocode, GeocoderUnavailable } from './geocoding.service';
import { inIndiaBbox } from './postal-import';
import { checkDestination } from '../serviceability/serviceability.service';

const RETRY_AFTER_SECONDS = '30';

function unavailable(res: Response, code: 'LOOKUP_UNAVAILABLE' | 'GEOLOCATION_UNAVAILABLE', message: string) {
  res.set('Retry-After', RETRY_AFTER_SECONDS);
  return new AppError(message, code, 503);
}

// GET /locations/pincode/:pincode — postal validity and details from the India Post directory.
// Deliberately says nothing about BuildX delivery: a real PIN is not the same as a served one.
export async function getPincode(req: Request, res: Response, next: NextFunction) {
  try {
    const pincode = String(req.params.pincode);
    if (!PINCODE_RE.test(pincode)) {
      throw new AppError('Enter a valid 6-digit PIN code', 'PINCODE_INVALID', 400);
    }
    let postal: PostalLookup | null;
    try {
      postal = await lookupPincode(pincode);
    } catch (err) {
      if (err instanceof PostalLookupUnavailable) {
        throw unavailable(res, 'LOOKUP_UNAVAILABLE', 'PIN code lookup is temporarily unavailable. Please try again.');
      }
      throw err;
    }
    if (!postal) {
      res.set('Cache-Control', 'public, max-age=3600');
      throw new AppError(`PIN code ${pincode} was not found in the India Post directory`, 'PINCODE_NOT_FOUND', 404);
    }
    // Directory releases are monthly; a day of HTTP caching is safe
    res.set('Cache-Control', 'public, max-age=86400');
    res.json(ok(postal));
  } catch (err) { next(err); }
}

// POST /locations/reverse { lat, lng } — candidate PIN for the buyer's optional GPS position.
// The result must be confirmed by the buyer; coordinates come in the body so they stay out of
// URLs and access logs, and they are not stored.
export async function reverse(req: Request, res: Response, next: NextFunction) {
  try {
    const { lat, lng } = req.body as { lat: number; lng: number };
    if (!inIndiaBbox(lat, lng)) {
      throw new AppError('This location is outside India. Enter your delivery PIN code instead.', 'OUTSIDE_INDIA', 422);
    }

    let detected;
    try {
      detected = await reverseGeocode(lat, lng);
    } catch (err) {
      if (err instanceof GeocoderUnavailable) {
        throw unavailable(res, 'GEOLOCATION_UNAVAILABLE', "We couldn't detect your location right now. Please enter your PIN code.");
      }
      throw err;
    }

    if (detected.status === 'NO_RESULT' || !PINCODE_RE.test(detected.pincode)) {
      throw new AppError("We couldn't find a PIN code for this location. Please enter it manually.", 'LOCATION_NOT_RESOLVED', 404);
    }
    if (detected.countryCode !== 'IN') {
      throw new AppError('This location is outside India. Enter your delivery PIN code instead.', 'OUTSIDE_INDIA', 422);
    }

    // Cross-check against India Post; an unknown or unverifiable PIN is reported, not hidden
    let postal: PostalLookup | null = null;
    let postalStatus: 'VALID' | 'NOT_FOUND' | 'UNAVAILABLE';
    try {
      postal = await lookupPincode(detected.pincode);
      postalStatus = postal ? 'VALID' : 'NOT_FOUND';
    } catch (err) {
      if (!(err instanceof PostalLookupUnavailable)) throw err;
      postalStatus = 'UNAVAILABLE';
    }

    res.set('Cache-Control', 'no-store');
    res.json(ok({
      pincode: detected.pincode,
      detected: { locality: detected.locality, district: detected.district, state: detected.state },
      postalStatus,
      postal,
      // GPS is approximate: the buyer must confirm (or correct) the PIN before it is used
      requiresConfirmation: true,
    }));
  } catch (err) { next(err); }
}

// GET /locations/pincode/:pincode/serviceability — does any eligible supplier deliver here?
// Separate from the postal lookup: a valid PIN with no suppliers is a normal, clear answer.
export async function getServiceability(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await checkDestination(String(req.params.pincode));
    // Coverage changes as suppliers edit their lists — keep caches short
    res.set('Cache-Control', 'public, max-age=60');
    res.json(ok(result));
  } catch (err) {
    if (err instanceof AppError && err.code === 'LOOKUP_UNAVAILABLE') res.set('Retry-After', RETRY_AFTER_SECONDS);
    next(err);
  }
}
