import { env } from '../../config/env';
import { logger } from '../../shared/logger/logger';

// Server-side wrapper around Google's Geocoding API, used only to turn a buyer's optional
// GPS position into a candidate PIN code. The API key stays on the server; neither the key
// nor the coordinates are logged.

const GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';
const TIMEOUT_MS = 5000;

export class GeocoderUnavailable extends Error {
  constructor(reason: 'NOT_CONFIGURED' | 'PROVIDER_ERROR' | 'TIMEOUT') {
    super(reason);
    this.name = 'GeocoderUnavailable';
  }
}

export type ReverseGeocodeResult =
  | { status: 'OK'; pincode: string; countryCode: string; locality?: string; district?: string; state?: string }
  | { status: 'NO_RESULT' };

type GoogleComponent = { long_name: string; short_name: string; types: string[] };
type GoogleResponse = { status: string; results?: { address_components: GoogleComponent[] }[] };

const component = (components: GoogleComponent[], type: string) => components.find((c) => c.types.includes(type));

export async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult> {
  const key = env.GOOGLE_MAPS_API_KEY;
  if (!key) throw new GeocoderUnavailable('NOT_CONFIGURED');

  const url = new URL(GEOCODE_URL);
  url.searchParams.set('latlng', `${lat},${lng}`);
  url.searchParams.set('result_type', 'postal_code');
  url.searchParams.set('language', 'en');
  url.searchParams.set('key', key);

  let body: GoogleResponse;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) {
      logger.warn('[geocode] provider HTTP error', { httpStatus: res.status });
      throw new GeocoderUnavailable('PROVIDER_ERROR');
    }
    body = (await res.json()) as GoogleResponse;
  } catch (err) {
    if (err instanceof GeocoderUnavailable) throw err;
    const timedOut = (err as Error)?.name === 'TimeoutError' || (err as Error)?.name === 'AbortError';
    logger.warn('[geocode] provider request failed', { reason: timedOut ? 'timeout' : (err as Error)?.name });
    throw new GeocoderUnavailable(timedOut ? 'TIMEOUT' : 'PROVIDER_ERROR');
  }

  if (body.status === 'ZERO_RESULTS') return { status: 'NO_RESULT' };
  if (body.status !== 'OK') {
    // OVER_QUERY_LIMIT, REQUEST_DENIED, INVALID_REQUEST, UNKNOWN_ERROR — only the status is logged
    logger.warn('[geocode] provider status', { status: body.status });
    throw new GeocoderUnavailable('PROVIDER_ERROR');
  }

  for (const result of body.results ?? []) {
    const postal = component(result.address_components, 'postal_code');
    const country = component(result.address_components, 'country');
    if (!postal || !country) continue;
    return {
      status: 'OK',
      pincode: postal.long_name.replace(/\s/g, ''),
      countryCode: country.short_name,
      locality: (component(result.address_components, 'locality') ?? component(result.address_components, 'sublocality'))?.long_name,
      district: component(result.address_components, 'administrative_area_level_3')?.long_name
        ?? component(result.address_components, 'administrative_area_level_2')?.long_name,
      state: component(result.address_components, 'administrative_area_level_1')?.long_name,
    };
  }
  return { status: 'NO_RESULT' };
}
