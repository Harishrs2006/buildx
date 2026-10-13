import { ClientSession, Types } from 'mongoose';
import { SupplierProfile } from '../../infrastructure/database/models/SupplierProfile.model';
import { User } from '../../infrastructure/database/models/User.model';
import { AppError } from '../../shared/errors/AppError';
import { lookupPincode, PINCODE_RE, PostalLookupUnavailable, type PostalLookup } from '../locations/postal-directory.service';

// Serviceability = "can BuildX deliver this supplier's goods to this PIN?"
// It is deliberately separate from postal validity (features/locations): a PIN that India
// Post knows is NOT serviceable unless an eligible supplier has explicitly listed it.
// A supplier with no configured PINs serves nowhere.

export const MAX_SERVICE_PINCODES = 500; // per supplier
export const MAX_PINCODES_PER_REQUEST = 50;

export type NotServiceableReason =
  | 'NO_SUPPLIERS'            // valid PIN, no eligible supplier lists it
  | 'PINCODE_NOT_SERVED'      // this supplier doesn't list it
  | 'SUPPLIER_NOT_AVAILABLE'; // supplier not verified, deactivated, or suspended

export type Destination = Pick<PostalLookup, 'pincode' | 'district' | 'state'>;

function unavailable(): AppError {
  return new AppError('Location check is temporarily unavailable. Please try again.', 'LOOKUP_UNAVAILABLE', 503);
}

export function notServiceable(reason: NotServiceableReason, pincode?: string): AppError {
  const message = {
    NO_SUPPLIERS: `No suppliers deliver to ${pincode} yet`,
    PINCODE_NOT_SERVED: `This supplier doesn't deliver to ${pincode}`,
    SUPPLIER_NOT_AVAILABLE: 'This supplier is not taking orders right now',
  }[reason];
  return new AppError(message, 'NOT_SERVICEABLE', 409, { reason, pincode });
}

/**
 * Steps 1–2: validate the PIN's format and resolve it in the postal directory.
 * @throws AppError PINCODE_INVALID (400) | PINCODE_NOT_FOUND (404) | LOOKUP_UNAVAILABLE (503)
 */
export async function resolveDestination(pincode: unknown): Promise<Destination> {
  if (typeof pincode !== 'string' || !PINCODE_RE.test(pincode)) {
    throw new AppError('Enter a valid 6-digit PIN code', 'PINCODE_INVALID', 400);
  }
  let postal: PostalLookup | null;
  try {
    postal = await lookupPincode(pincode);
  } catch (err) {
    if (err instanceof PostalLookupUnavailable) throw unavailable();
    throw err;
  }
  if (!postal) throw new AppError(`PIN code ${pincode} was not found in the India Post directory`, 'PINCODE_NOT_FOUND', 404);
  return { pincode: postal.pincode, district: postal.district, state: postal.state };
}

// Suppliers whose listings may be shown or ordered at all: verified, profile active, account
// not suspended. Optionally narrowed to those that list `pincode`.
const eligibleProfileFilter = (pincode?: string) => ({
  verificationStatus: 'VERIFIED',
  isActive: true,
  ...(pincode ? { servicePincodes: pincode } : {}),
});

async function dropSuspended(profiles: { _id: Types.ObjectId; userId: Types.ObjectId }[], session?: ClientSession) {
  if (profiles.length === 0) return [];
  const active = await User.find({ _id: { $in: profiles.map((p) => p.userId) }, isActive: true })
    .select('_id')
    .session(session ?? null)
    .lean();
  const activeIds = new Set(active.map((u) => u._id.toString()));
  return profiles.filter((p) => activeIds.has(p.userId.toString())).map((p) => p._id);
}

/**
 * Supplier profile IDs whose products may be listed/ordered, optionally only those serving
 * `pincode` (pass an already-validated PIN).
 * @throws AppError LOOKUP_UNAVAILABLE (503) on database failure
 */
export async function eligibleSupplierIds(pincode?: string): Promise<Types.ObjectId[]> {
  try {
    const profiles = await SupplierProfile.find(eligibleProfileFilter(pincode)).select('_id userId').lean();
    return await dropSuspended(profiles);
  } catch {
    throw unavailable();
  }
}

/**
 * Step 3: can this supplier take an order for `pincode` (already validated)? Without a
 * pincode, only checks the supplier is eligible at all (legacy clients). Pass `session`
 * to read inside an order transaction.
 * @throws AppError LOOKUP_UNAVAILABLE (503) on database failure
 */
export async function checkSupplier(params: {
  supplierProfileId: Types.ObjectId | string;
  pincode?: string;
  session?: ClientSession;
}): Promise<{ serviceable: true } | { serviceable: false; reason: NotServiceableReason }> {
  const { supplierProfileId, pincode, session } = params;
  try {
    const profile = await SupplierProfile.findOne({ _id: supplierProfileId, ...eligibleProfileFilter() })
      .select('_id userId servicePincodes')
      .session(session ?? null)
      .lean();
    if (!profile || (await dropSuspended([profile], session)).length === 0) {
      return { serviceable: false, reason: 'SUPPLIER_NOT_AVAILABLE' };
    }
    if (pincode && !(profile.servicePincodes ?? []).includes(pincode)) {
      return { serviceable: false, reason: 'PINCODE_NOT_SERVED' };
    }
    return { serviceable: true };
  } catch {
    throw unavailable();
  }
}

/** Steps 1–4 for a whole destination: is anyone delivering there? */
export async function checkDestination(pincode: unknown) {
  const destination = await resolveDestination(pincode);
  const supplierIds = await eligibleSupplierIds(destination.pincode);
  return {
    ...destination,
    serviceable: supplierIds.length > 0,
    supplierCount: supplierIds.length,
    ...(supplierIds.length === 0 ? { reason: 'NO_SUPPLIERS' as const } : {}),
  };
}
