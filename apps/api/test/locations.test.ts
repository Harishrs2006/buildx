import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { startDb, stopDb, clearDb, makeApp } from './helpers';
import { env } from '../src/config/env';
import { logger } from '../src/shared/logger/logger';
import { importPostalDirectory } from '../src/features/locations/postal-import';
import { PostalOffice } from '../src/infrastructure/database/models/PostalOffice.model';
import { HEADER_RECENT, ROWS_RECENT, csv, chunked } from './fixtures/postal';

const lookup = (app: ReturnType<typeof makeApp>, pin: string) => request(app).get(`/api/v1/locations/pincode/${pin}`);
const reverse = (app: ReturnType<typeof makeApp>, body: unknown) => request(app).post('/api/v1/locations/reverse').send(body as object);

const loadDirectory = () =>
  importPostalDirectory({ source: chunked(csv(HEADER_RECENT, ROWS_RECENT), 100), sourceFile: 'test.csv', version: 'test-1' });

// Google Geocoding responses (shape per Google's documented format; values synthetic)
const googleOk = (pincode: string, country = 'IN') => ({
  status: 'OK',
  results: [{
    address_components: [
      { long_name: pincode, short_name: pincode, types: ['postal_code'] },
      { long_name: 'Kuvempunagar', short_name: 'Kuvempunagar', types: ['sublocality', 'political'] },
      { long_name: 'Tumakuru', short_name: 'Tumakuru', types: ['administrative_area_level_3', 'political'] },
      { long_name: 'Karnataka', short_name: 'KA', types: ['administrative_area_level_1', 'political'] },
      { long_name: country === 'IN' ? 'India' : 'Nepal', short_name: country, types: ['country', 'political'] },
    ],
  }],
});
const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const TEST_KEY = 'test-maps-key-not-real-123';
const IN_TUMAKURU = { lat: 13.3392, lng: 77.114 };

beforeAll(startDb);
afterAll(stopDb);

describe('GET /locations/pincode/:pincode', () => {
  let app: ReturnType<typeof makeApp>;
  beforeEach(async () => {
    vi.restoreAllMocks();
    await clearDb();
    app = makeApp();
  });

  it.each(['57210', '5721034', '072103', 'abcdef', '57210a', '57%20103', '-72103'])('rejects malformed input %s', async (pin) => {
    await loadDirectory();
    const res = await lookup(app, pin);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('PINCODE_INVALID');
  });

  it('returns postal details for a known PIN, with attribution and no serviceability claim', async () => {
    await loadDirectory();
    const res = await lookup(app, '572103');
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('public, max-age=86400');
    expect(res.body.data).toMatchObject({
      pincode: '572103',
      district: 'TUMAKURU',
      state: 'KARNATAKA',
      hasDeliveryOffice: true,
      source: { datasetVersion: 'test-1' },
    });
    expect(res.body.data.source.attribution).toMatch(/Department of Posts/);
    expect(res.body.data.postOffices).toHaveLength(2);
    // Postal validity is not delivery availability
    expect(JSON.stringify(res.body)).not.toMatch(/servic/i);
  });

  it('reports PINs that only have non-delivery offices', async () => {
    await loadDirectory();
    const res = await lookup(app, '400001');
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ hasDeliveryOffice: false, approxLocation: null });
  });

  it('returns 404 for a well-formed PIN that India Post does not know', async () => {
    await loadDirectory();
    const res = await lookup(app, '999999');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('PINCODE_NOT_FOUND');
  });

  it('returns 503 with Retry-After when no directory has been imported', async () => {
    const res = await lookup(app, '572103');
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('LOOKUP_UNAVAILABLE');
    expect(res.headers['retry-after']).toBe('30');
  });

  it('returns 503 when the directory cannot be read', async () => {
    await loadDirectory();
    vi.spyOn(PostalOffice, 'find').mockImplementationOnce(() => { throw new Error('connection reset'); });
    const res = await lookup(app, '572103');
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('LOOKUP_UNAVAILABLE');
  });

  it('needs no sign-in', async () => {
    await loadDirectory();
    expect((await lookup(app, '560001')).status).toBe(200);
  });
});

describe('POST /locations/reverse', () => {
  let app: ReturnType<typeof makeApp>;
  let fetchMock: ReturnType<typeof vi.fn>;
  const savedKey = env.GOOGLE_MAPS_API_KEY;

  beforeEach(async () => {
    vi.restoreAllMocks();
    await clearDb();
    app = makeApp(); // fresh rate-limit state per test
    env.GOOGLE_MAPS_API_KEY = TEST_KEY;
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    env.GOOGLE_MAPS_API_KEY = savedKey;
  });

  it.each([
    [{}],
    [{ lat: '13.3', lng: 77.1 }],
    [{ lat: 91, lng: 77.1 }],
    [{ lat: 13.3, lng: 181 }],
    [{ lat: null, lng: null }],
  ])('rejects invalid coordinates %j without calling the provider', async (body) => {
    const res = await reverse(app, body);
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects positions outside India without calling the provider', async () => {
    const res = await reverse(app, { lat: 51.5074, lng: -0.1278 });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('OUTSIDE_INDIA');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns 503 when geocoding is not configured', async () => {
    env.GOOGLE_MAPS_API_KEY = undefined;
    const res = await reverse(app, IN_TUMAKURU);
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('GEOLOCATION_UNAVAILABLE');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('resolves a position to a PIN, cross-checked with India Post, pending confirmation', async () => {
    await loadDirectory();
    fetchMock.mockResolvedValueOnce(jsonResponse(googleOk('572103')));
    const res = await reverse(app, IN_TUMAKURU);
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.body.data).toMatchObject({
      pincode: '572103',
      postalStatus: 'VALID',
      requiresConfirmation: true,
      detected: { locality: 'Kuvempunagar', district: 'Tumakuru', state: 'Karnataka' },
    });
    expect(res.body.data.postal.district).toBe('TUMAKURU');

    // Key is sent to Google from the server only, never back to the client
    const calledUrl = new URL(String(fetchMock.mock.calls[0][0]));
    expect(calledUrl.origin + calledUrl.pathname).toBe('https://maps.googleapis.com/maps/api/geocode/json');
    expect(calledUrl.searchParams.get('key')).toBe(TEST_KEY);
    expect(calledUrl.searchParams.get('result_type')).toBe('postal_code');
    expect(JSON.stringify(res.body)).not.toContain(TEST_KEY);
  });

  it('flags a detected PIN that India Post does not know', async () => {
    await loadDirectory();
    fetchMock.mockResolvedValueOnce(jsonResponse(googleOk('572199')));
    const res = await reverse(app, IN_TUMAKURU);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ pincode: '572199', postalStatus: 'NOT_FOUND', postal: null });
  });

  it('still returns the detected PIN when the directory is unavailable', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(googleOk('572103')));
    const res = await reverse(app, IN_TUMAKURU);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ pincode: '572103', postalStatus: 'UNAVAILABLE', postal: null });
  });

  it('returns 404 when no PIN code is found for the position', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ status: 'ZERO_RESULTS', results: [] }));
    const res = await reverse(app, IN_TUMAKURU);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('LOCATION_NOT_RESOLVED');
  });

  it('rejects a result in another country near the border', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(googleOk('44600', 'NP')));
    expect((await reverse(app, { lat: 27.7172, lng: 85.324 })).status).toBe(404); // 5-digit: not an Indian PIN
    fetchMock.mockResolvedValueOnce(jsonResponse(googleOk('446000', 'NP')));
    const res = await reverse(app, { lat: 27.7172, lng: 85.324 });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('OUTSIDE_INDIA');
  });

  it.each([
    ['quota exceeded', () => jsonResponse({ status: 'OVER_QUERY_LIMIT' })],
    ['key rejected', () => jsonResponse({ status: 'REQUEST_DENIED', error_message: 'The provided API key is invalid.' })],
    ['HTTP 500', () => jsonResponse({}, 500)],
    ['network error', () => { throw new TypeError('fetch failed'); }],
    ['timeout', () => { throw Object.assign(new Error('timed out'), { name: 'TimeoutError' }); }],
  ])('returns 503 on provider failure (%s) without leaking the key or coordinates to logs', async (_label, respond) => {
    const warn = vi.spyOn(logger, 'warn');
    fetchMock.mockImplementationOnce(async () => respond());
    const res = await reverse(app, IN_TUMAKURU);
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('GEOLOCATION_UNAVAILABLE');
    expect(res.headers['retry-after']).toBe('30');
    const logged = JSON.stringify(warn.mock.calls);
    expect(logged).not.toContain(TEST_KEY);
    expect(logged).not.toContain('13.3392');
    expect(logged).not.toContain('77.114');
  });

  it('rate-limits reverse lookups per IP', async () => {
    fetchMock.mockImplementation(async () => jsonResponse(googleOk('572103')));
    for (let i = 0; i < 10; i++) expect((await reverse(app, IN_TUMAKURU)).status).toBe(200);
    const blocked = await reverse(app, IN_TUMAKURU);
    expect(blocked.status).toBe(429);
    expect(fetchMock).toHaveBeenCalledTimes(10);
  });
});
