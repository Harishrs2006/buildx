import { ApiClientError, isAbortError, type ApiClient } from '../api/client';
import { postalLookupSchema, serviceabilitySchema, reverseLookupSchema, type PostalLookup, type ReverseLookup, type Serviceability } from '../api/schemas';
import { validatePincode } from './pincode';

// Postal validity and BuildX serviceability are different questions with different endpoints.
// A location is only ever reported as deliverable when the serviceability endpoint itself
// returned serviceable === true for that exact PIN.

/** What the UI shows about a place — the API's postal data, trimmed for display */
export type PlaceInfo = {
  pincode: string;
  district: string;
  state: string;
  postOffices: string[];   // names, delivery offices first
  hasDeliveryOffice?: boolean;
};

export type LocationCheck =
  | { status: 'invalid'; input: string; message: string }
  | { status: 'not-found'; pincode: string; message: string }
  | { status: 'not-serviceable'; pincode: string; place: PlaceInfo; message: string }
  | { status: 'serviceable'; pincode: string; place: PlaceInfo; supplierCount: number }
  // Couldn't verify — must NOT be treated as deliverable. `place` may be known if only the
  // serviceability check failed.
  | { status: 'unavailable'; pincode: string; place: PlaceInfo | null; message: string; retryAfterSeconds?: number };

export const describePlace = (p: PlaceInfo) =>
  [p.postOffices[0], p.district, p.state].filter(Boolean).join(', ');

function placeFromPostal(p: PostalLookup): PlaceInfo {
  const delivery = p.postOffices.filter((o) => /^delivery$/i.test(o.deliveryStatus ?? ''));
  const others = p.postOffices.filter((o) => !/^delivery$/i.test(o.deliveryStatus ?? ''));
  return {
    pincode: p.pincode,
    district: p.district,
    state: p.state,
    postOffices: [...delivery, ...others].map((o) => o.name),
    hasDeliveryOffice: p.hasDeliveryOffice,
  };
}

const UNAVAILABLE_MESSAGE = "We couldn't check delivery for this PIN right now. You can retry, or keep browsing — delivery will be confirmed at checkout.";

/** GET /locations/pincode/:pincode — postal validity only */
export const fetchPostal = (client: ApiClient, pincode: string, signal?: AbortSignal) =>
  client.request(`/locations/pincode/${pincode}`, { schema: postalLookupSchema, envelope: true, signal });

/** GET /locations/pincode/:pincode/serviceability — does any eligible supplier deliver here? Always fresh. */
export const fetchServiceability = (client: ApiClient, pincode: string, signal?: AbortSignal, cache?: RequestCache) =>
  client.request(`/locations/pincode/${pincode}/serviceability`, { schema: serviceabilitySchema, envelope: true, signal, cache });

/**
 * Full check for a PIN typed (or confirmed) by the buyer. Postal and serviceability are
 * requested in parallel; aborts are re-thrown so callers can ignore superseded checks.
 */
export async function checkPincode(client: ApiClient, input: string, signal?: AbortSignal): Promise<LocationCheck> {
  const v = validatePincode(input);
  if (!v.valid) return { status: 'invalid', input, message: v.message };
  const pincode = v.pincode;

  const [postal, svc] = await Promise.allSettled([fetchPostal(client, pincode, signal), fetchServiceability(client, pincode, signal)]);
  if (signal?.aborted || [postal, svc].some((r) => r.status === 'rejected' && isAbortError(r.reason))) {
    throw new DOMException('Request aborted', 'AbortError');
  }

  const code = (r: PromiseSettledResult<unknown>) =>
    r.status === 'rejected' && r.reason instanceof ApiClientError ? r.reason.code : null;
  const notFound = code(postal) === 'PINCODE_NOT_FOUND' || code(svc) === 'PINCODE_NOT_FOUND';
  if (notFound) {
    return { status: 'not-found', pincode, message: `PIN code ${pincode} isn't in the India Post directory. Please check it.` };
  }
  if (code(postal) === 'PINCODE_INVALID' || code(svc) === 'PINCODE_INVALID') {
    return { status: 'invalid', input, message: 'Enter a valid 6-digit PIN code' };
  }

  const place: PlaceInfo | null =
    postal.status === 'fulfilled' ? placeFromPostal(postal.value)
    : svc.status === 'fulfilled' ? { pincode, district: svc.value.district, state: svc.value.state, postOffices: [] }
    : null;

  if (svc.status === 'rejected' || !place) {
    const reason = svc.status === 'rejected' ? svc.reason : postal.status === 'rejected' ? postal.reason : null;
    return {
      status: 'unavailable',
      pincode,
      place,
      message: UNAVAILABLE_MESSAGE,
      retryAfterSeconds: reason instanceof ApiClientError ? reason.retryAfterSeconds : undefined,
    };
  }

  const s: Serviceability = svc.value;
  if (s.pincode !== pincode) {
    // Response for a different PIN — never trust it
    return { status: 'unavailable', pincode, place, message: UNAVAILABLE_MESSAGE };
  }
  if (s.serviceable) return { status: 'serviceable', pincode, place, supplierCount: s.supplierCount };
  return {
    status: 'not-serviceable',
    pincode,
    place,
    message: `BuildX doesn't deliver to ${pincode} yet. You can still browse products.`,
  };
}

// ─── GPS ────────────────────────────────────────────────────────────────────

export type GpsFailure = 'unsupported' | 'insecure' | 'denied' | 'unavailable' | 'timeout';

export class GpsError extends Error {
  constructor(readonly reason: GpsFailure) {
    super(reason);
    this.name = 'GpsError';
  }
}

export const GPS_MESSAGES: Record<GpsFailure, string> = {
  unsupported: "Your browser can't share its location. Please enter your PIN code.",
  insecure: 'Location can only be used on a secure (https) page. Please enter your PIN code.',
  denied: 'Location permission was denied. You can enter your PIN code instead.',
  unavailable: "We couldn't get your location. Please enter your PIN code.",
  timeout: 'Finding your location took too long. Please enter your PIN code.',
};

// ~110 m precision is plenty to find a PIN code and avoids sending an exact position
const roundCoord = (n: number) => Math.round(n * 1000) / 1000;

/**
 * Asks the browser for the current position. Only call this from a user action — the
 * permission prompt must never appear on page load.
 */
export function getBrowserPosition(
  geolocation: Geolocation | undefined = typeof navigator !== 'undefined' ? navigator.geolocation : undefined,
  isSecure: boolean = typeof window === 'undefined' || window.isSecureContext !== false
): Promise<{ lat: number; lng: number }> {
  if (!geolocation) return Promise.reject(new GpsError('unsupported'));
  if (!isSecure) return Promise.reject(new GpsError('insecure'));
  return new Promise((resolve, reject) => {
    geolocation.getCurrentPosition(
      (pos) => resolve({ lat: roundCoord(pos.coords.latitude), lng: roundCoord(pos.coords.longitude) }),
      (err) => reject(new GpsError(err.code === 1 ? 'denied' : err.code === 3 ? 'timeout' : 'unavailable')),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 }
    );
  });
}

/** POST /locations/reverse — server-side reverse geocoding (Google is never called from the browser) */
export const reverseGeocode = (client: ApiClient, coords: { lat: number; lng: number }, signal?: AbortSignal): Promise<ReverseLookup> =>
  client.request('/locations/reverse', { method: 'POST', body: coords, schema: reverseLookupSchema, envelope: true, signal });

export type GpsCandidate = { pincode: string; place: PlaceInfo | null; detectedLabel: string };

export function gpsCandidate(r: ReverseLookup): GpsCandidate {
  const detectedLabel = [r.detected.locality, r.detected.district, r.detected.state].filter(Boolean).join(', ');
  return { pincode: r.pincode, place: r.postal ? placeFromPostal(r.postal) : null, detectedLabel };
}

export function reverseFailureMessage(err: unknown): string {
  if (err instanceof ApiClientError) {
    if (err.code === 'OUTSIDE_INDIA') return 'Your location appears to be outside India. Please enter your delivery PIN code.';
    if (err.code === 'LOCATION_NOT_RESOLVED') return "We couldn't find a PIN code for your location. Please enter it manually.";
    if (err.code === 'TOO_MANY_REQUESTS') return 'Too many location requests. Please enter your PIN code.';
  }
  return "We couldn't look up your location right now. Please enter your PIN code.";
}
