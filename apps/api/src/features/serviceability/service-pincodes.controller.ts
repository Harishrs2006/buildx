import { Request, Response, NextFunction } from 'express';
import { ok } from '@buildx/shared';
import { SupplierProfile } from '../../infrastructure/database/models/SupplierProfile.model';
import { AppError } from '../../shared/errors/AppError';
import { PINCODE_RE, PostalLookupUnavailable, summarisePincodes } from '../locations/postal-directory.service';
import { MAX_SERVICE_PINCODES } from './serviceability.service';

// Supplier-owned coverage: /suppliers/me/service-pincodes. Mounted behind
// requireAuth + requireRole('SUPPLIER'); every query is scoped to the caller's own profile.

type Rejection = { pincode: string; reason: 'MALFORMED' | 'NOT_FOUND' | 'NO_DELIVERY_OFFICE' };

async function ownProfile(req: Request) {
  const profile = await SupplierProfile.findOne({ userId: req.auth!.userId })
    .select('_id servicePincodes verificationStatus isActive')
    .lean();
  if (!profile) throw AppError.notFound('Supplier profile');
  return profile;
}

function directoryUnavailable(res: Response) {
  res.set('Retry-After', '30');
  return new AppError(
    "PIN codes can't be checked right now, so coverage can't be changed. Please try again shortly.",
    'LOOKUP_UNAVAILABLE',
    503
  );
}

// Postal details are looked up, not stored on the supplier
async function describe(pincodes: string[]) {
  try {
    const found = await summarisePincodes(pincodes);
    return {
      postalStatus: 'AVAILABLE' as const,
      pincodes: pincodes.map((p) => {
        const s = found.get(p);
        return s
          ? { pincode: p, district: s.district, state: s.state, hasDeliveryOffice: s.hasDeliveryOffice }
          : { pincode: p, district: null, state: null, hasDeliveryOffice: false, missingFromDirectory: true };
      }),
    };
  } catch (err) {
    if (!(err instanceof PostalLookupUnavailable)) throw err;
    // Still show the supplier their list even if names can't be resolved
    return { postalStatus: 'UNAVAILABLE' as const, pincodes: pincodes.map((p) => ({ pincode: p })) };
  }
}

function coverageNote(profile: { verificationStatus: string; isActive: boolean }) {
  if (!profile.isActive) return 'Your supplier account is inactive, so buyers cannot order from you.';
  if (profile.verificationStatus !== 'VERIFIED') return 'Buyers can order once BuildX verifies your business.';
  return undefined;
}

// GET /suppliers/me/service-pincodes
export async function listServicePincodes(req: Request, res: Response, next: NextFunction) {
  try {
    const profile = await ownProfile(req);
    const sorted = [...(profile.servicePincodes ?? [])].sort();
    const described = await describe(sorted);
    res.json(ok({ ...described, count: sorted.length, limit: MAX_SERVICE_PINCODES, note: coverageNote(profile) }));
  } catch (err) { next(err); }
}

// POST /suppliers/me/service-pincodes { pincodes: string[] } — all-or-nothing
export async function addServicePincodes(req: Request, res: Response, next: NextFunction) {
  try {
    const requested = [...new Set((req.body.pincodes as string[]).map((p) => p.trim()))];
    const profile = await ownProfile(req);

    const rejected: Rejection[] = requested
      .filter((p) => !PINCODE_RE.test(p))
      .map((pincode) => ({ pincode, reason: 'MALFORMED' }));
    const wellFormed = requested.filter((p) => PINCODE_RE.test(p));

    let found;
    try {
      found = await summarisePincodes(wellFormed);
    } catch (err) {
      if (err instanceof PostalLookupUnavailable) throw directoryUnavailable(res);
      throw err;
    }
    for (const p of wellFormed) {
      const s = found.get(p);
      if (!s) rejected.push({ pincode: p, reason: 'NOT_FOUND' });
      // India Post doesn't deliver to any office on this PIN — not a usable delivery address
      else if (!s.hasDeliveryOffice) rejected.push({ pincode: p, reason: 'NO_DELIVERY_OFFICE' });
    }
    if (rejected.length) {
      throw AppError.badRequest(`${rejected.length} PIN code(s) can't be added; nothing was changed`, rejected);
    }

    const existing = new Set(profile.servicePincodes ?? []);
    const toAdd = wellFormed.filter((p) => !existing.has(p));
    const alreadyPresent = wellFormed.filter((p) => existing.has(p));

    // $addToSet prevents duplicates; the $expr guard enforces the cap atomically even under
    // concurrent requests
    const updated = await SupplierProfile.findOneAndUpdate(
      {
        _id: profile._id,
        $expr: {
          $lte: [{ $size: { $setUnion: [{ $ifNull: ['$servicePincodes', []] }, wellFormed] } }, MAX_SERVICE_PINCODES],
        },
      },
      { $addToSet: { servicePincodes: { $each: wellFormed } } },
      { new: true, runValidators: true }
    ).select('servicePincodes').lean();
    if (!updated) {
      throw AppError.badRequest(`A supplier can serve at most ${MAX_SERVICE_PINCODES} PIN codes`);
    }

    res.status(toAdd.length ? 201 : 200).json(ok({
      added: toAdd.sort(),
      alreadyPresent: alreadyPresent.sort(),
      count: updated.servicePincodes.length,
      limit: MAX_SERVICE_PINCODES,
    }));
  } catch (err) { next(err); }
}

// DELETE /suppliers/me/service-pincodes/:pincode — idempotent
export async function removeServicePincode(req: Request, res: Response, next: NextFunction) {
  try {
    const pincode = String(req.params.pincode);
    if (!PINCODE_RE.test(pincode)) throw new AppError('Enter a valid 6-digit PIN code', 'PINCODE_INVALID', 400);
    const profile = await ownProfile(req);
    const updated = await SupplierProfile.findOneAndUpdate(
      { _id: profile._id },
      { $pull: { servicePincodes: pincode } },
      { new: true }
    ).select('servicePincodes').lean();
    res.json(ok({
      pincode,
      removed: (profile.servicePincodes ?? []).includes(pincode),
      count: updated?.servicePincodes.length ?? 0,
    }));
  } catch (err) { next(err); }
}

// GET /suppliers/me/service-pincodes/:pincode — preview before adding
export async function previewServicePincode(req: Request, res: Response, next: NextFunction) {
  try {
    const pincode = String(req.params.pincode);
    if (!PINCODE_RE.test(pincode)) throw new AppError('Enter a valid 6-digit PIN code', 'PINCODE_INVALID', 400);
    const profile = await ownProfile(req);
    const described = await describe([pincode]);
    if (described.postalStatus === 'UNAVAILABLE') throw directoryUnavailable(res);
    const info = described.pincodes[0];
    res.json(ok({
      ...info,
      servedByYou: (profile.servicePincodes ?? []).includes(pincode),
      canAdd: !('missingFromDirectory' in info) && info.hasDeliveryOffice === true,
      note: coverageNote(profile),
    }));
  } catch (err) { next(err); }
}
