import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { createApiClient, ApiClientError, isAbortError } from '../src/api/client';
import { validatePincode } from '../src/location/pincode';
import { checkPincode, getBrowserPosition, GpsError } from '../src/location/lookup';
import { BASE, mockApi, ok, json, apiError, postal, svc, locationRoutes } from './helpers';

const client = (fetchMock: ReturnType<typeof mockApi>, timeoutMs?: number) =>
  createApiClient({ baseUrl: BASE, fetch: fetchMock as unknown as typeof fetch, timeoutMs });

describe('validatePincode', () => {
  it.each([
    ['572103', true],
    ['572 103', true],
    ['', 'Enter your 6-digit PIN code'],
    ['57210', 'A PIN code has exactly 6 digits'],
    ['5721034', 'A PIN code has exactly 6 digits'],
    ['57a103', 'A PIN code can only contain digits'],
    ['-72103', 'A PIN code can only contain digits'],
    ['072103', "PIN codes don't start with 0"],
  ])('%j', (input, expected) => {
    const r = validatePincode(input);
    if (expected === true) expect(r).toEqual({ valid: true, pincode: input.replace(/\s/g, '') });
    else expect(r).toEqual({ valid: false, message: expected });
  });
});

describe('API client', () => {
  it('requires an explicit absolute http(s) base URL', () => {
    expect(() => createApiClient({ baseUrl: '' })).toThrow(/absolute URL/);
    expect(() => createApiClient({ baseUrl: '/api/v1' })).toThrow(/absolute URL/);
    expect(() => createApiClient({ baseUrl: 'ftp://x.test/api' })).toThrow(/http/);
  });

  it('unwraps { success, data } and validates the payload', async () => {
    const f = mockApi({ 'GET /thing': ok({ n: 1 }) });
    await expect(client(f).request('/thing', { schema: z.object({ n: z.number() }), envelope: true })).resolves.toEqual({ n: 1 });
  });

  it('reads bare JSON endpoints (e.g. /products)', async () => {
    const f = mockApi({ 'GET /thing': json({ n: 2 }) });
    await expect(client(f).request('/thing', { schema: z.object({ n: z.number() }), envelope: false })).resolves.toEqual({ n: 2 });
  });

  it('turns API errors (enveloped or bare) into coded errors, with Retry-After', async () => {
    const f = mockApi({
      'GET /a': apiError(503, 'LOOKUP_UNAVAILABLE', 'try later', { 'Retry-After': '30' }),
      'GET /b': json({ message: 'Product not found' }, 404),
    });
    const a = await client(f).request('/a', { schema: z.any(), envelope: true }).catch((e) => e);
    expect(a).toBeInstanceOf(ApiClientError);
    expect(a).toMatchObject({ code: 'LOOKUP_UNAVAILABLE', status: 503, message: 'try later', retryAfterSeconds: 30 });
    const b = await client(f).request('/b', { schema: z.any(), envelope: false }).catch((e) => e);
    expect(b).toMatchObject({ code: 'HTTP_ERROR', status: 404, message: 'Product not found' });
  });

  it('sends custom headers but never lets them override Accept/Content-Type/Authorization', async () => {
    let seen: Headers | undefined;
    const f = mockApi({
      'POST /orders': (_url, init) => { seen = new Headers(init.headers); return ok({ orderId: '1' }); },
    });
    await client(f).request('/orders', {
      method: 'POST',
      body: { items: [] },
      auth: true,
      envelope: true,
      schema: z.any(),
      headers: { 'Idempotency-Key': 'abc123', Accept: 'text/plain', 'Content-Type': 'text/plain' },
    });
    expect(seen?.get('Idempotency-Key')).toBe('abc123');
    expect(seen?.get('Accept')).toBe('application/json');
    expect(seen?.get('Content-Type')).toBe('application/json');
  });

  it('requestPage returns data and pagination meta for a list endpoint', async () => {
    const meta = { total: 25, page: 2, limit: 10, totalPages: 3, hasNext: true, hasPrev: true };
    const f = mockApi({ 'GET /things': json({ success: true, data: [{ n: 1 }, { n: 2 }], meta }) });
    const result = await client(f).requestPage('/things', { schema: z.array(z.object({ n: z.number() })), envelope: true });
    expect(result).toEqual({ data: [{ n: 1 }, { n: 2 }], meta });
  });

  it('requestPage rejects a response missing meta', async () => {
    const f = mockApi({ 'GET /things': ok([{ n: 1 }]) });
    const err = await client(f).requestPage('/things', { schema: z.array(z.object({ n: z.number() })), envelope: true }).catch((e) => e);
    expect(err).toMatchObject({ code: 'INVALID_RESPONSE' });
  });

  it('rejects responses that do not match the expected shape', async () => {
    const f = mockApi({ 'GET /x': ok({ n: 'one' }), 'GET /y': json({ data: 1 }), 'GET /z': () => new Response('<html>', { status: 200 }) });
    for (const [path, envelope] of [['/x', true], ['/y', true], ['/z', false]] as const) {
      const err = await client(f).request(path, { schema: z.object({ n: z.number() }), envelope }).catch((e) => e);
      expect(err.code, path).toBe('INVALID_RESPONSE');
    }
  });

  it('reports network failures, timeouts and caller aborts distinctly', async () => {
    const down = vi.fn(async () => { throw new TypeError('Failed to fetch'); });
    const e1 = await createApiClient({ baseUrl: BASE, fetch: down }).request('/x', { schema: z.any(), envelope: true }).catch((e) => e);
    expect(e1.code).toBe('NETWORK_ERROR');

    const hang = vi.fn((_u: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
    }));
    const e2 = await createApiClient({ baseUrl: BASE, fetch: hang, timeoutMs: 20 }).request('/x', { schema: z.any(), envelope: true }).catch((e) => e);
    expect(e2.code).toBe('TIMEOUT');

    const controller = new AbortController();
    const pending = createApiClient({ baseUrl: BASE, fetch: hang }).request('/x', { schema: z.any(), envelope: true, signal: controller.signal });
    controller.abort();
    expect(isAbortError(await pending.catch((e) => e))).toBe(true);
  });

  it('builds query strings, sends tokens only when asked, never sends cookies', async () => {
    const f = mockApi({ 'GET /p': ok({}) , 'GET /q': ok({}) });
    const c = createApiClient({ baseUrl: BASE, fetch: f as unknown as typeof fetch, getAuthToken: async () => 'tok' });
    await c.request('/p', { schema: z.any(), envelope: true, query: { a: 'x y', b: undefined, c: 3 } });
    await c.request('/q', { schema: z.any(), envelope: true, auth: true, cache: 'no-store' });
    const [url1, init1] = f.mock.calls[0];
    expect(String(url1)).toBe(`${BASE}/p?a=x+y&c=3`);
    expect((init1 as RequestInit).headers).not.toHaveProperty('Authorization');
    expect((init1 as RequestInit).credentials).toBe('omit');
    const init2 = f.mock.calls[1][1] as RequestInit;
    expect(init2.headers).toHaveProperty('Authorization', 'Bearer tok');
    expect(init2.cache).toBe('no-store');
  });
});

describe('checkPincode — postal validity is not serviceability', () => {
  const c = (routes: Parameters<typeof mockApi>[0]) => client(mockApi(routes));

  it('valid PIN with delivery', async () => {
    const r = await checkPincode(c(locationRoutes({ '572103': 2 })), '572103');
    expect(r).toMatchObject({ status: 'serviceable', pincode: '572103', supplierCount: 2 });
    // Delivery offices are listed first for display
    expect(r.status === 'serviceable' && r.place.postOffices).toEqual(['Kuvempunagar S.O', 'R G Market S.O']);
  });

  it('valid PIN with no suppliers', async () => {
    const r = await checkPincode(c(locationRoutes({ '110001': 0 })), '110001');
    expect(r).toMatchObject({ status: 'not-serviceable', pincode: '110001' });
  });

  it('unknown PIN', async () => {
    expect(await checkPincode(c(locationRoutes({ '999999': 'not-found' })), '999999')).toMatchObject({ status: 'not-found' });
  });

  it('malformed input never reaches the API', async () => {
    const f = mockApi({});
    expect(await checkPincode(client(f), '57a10')).toMatchObject({ status: 'invalid' });
    expect(f).not.toHaveBeenCalled();
  });

  it.each([
    ['serviceability 503', { 'GET /locations/pincode/572103': ok(postal('572103')), 'GET /locations/pincode/572103/serviceability': apiError(503, 'LOOKUP_UNAVAILABLE', 'x', { 'Retry-After': '30' }) }, true],
    ['both endpoints down', { 'GET /locations/pincode/572103': () => { throw new TypeError('down'); }, 'GET /locations/pincode/572103/serviceability': () => { throw new TypeError('down'); } }, false],
    ['malformed serviceable flag', { 'GET /locations/pincode/572103': ok(postal('572103')), 'GET /locations/pincode/572103/serviceability': ok({ ...svc('572103', 2), serviceable: 'yes' }) }, true],
    ['serviceable with zero suppliers', { 'GET /locations/pincode/572103': ok(postal('572103')), 'GET /locations/pincode/572103/serviceability': ok({ ...svc('572103', 0), serviceable: true }) }, true],
    ['answer for a different PIN', { 'GET /locations/pincode/572103': ok(postal('572103')), 'GET /locations/pincode/572103/serviceability': ok(svc('560001', 3)) }, true],
  ])('failure (%s) is "unavailable", never serviceable', async (_label, routes, placeKnown) => {
    const r = await checkPincode(c(routes as Parameters<typeof mockApi>[0]), '572103');
    expect(r.status).toBe('unavailable');
    expect(r.status === 'unavailable' && r.place !== null).toBe(placeKnown);
  });

  it('a serviceability answer still counts if only the postal endpoint failed', async () => {
    const r = await checkPincode(c({
      'GET /locations/pincode/572103': apiError(503, 'LOOKUP_UNAVAILABLE'),
      'GET /locations/pincode/572103/serviceability': ok(svc('572103', 1)),
    }), '572103');
    expect(r).toMatchObject({ status: 'serviceable', place: { district: 'TUMAKURU', postOffices: [] } });
  });
});

describe('getBrowserPosition', () => {
  const geo = (impl: (ok: PositionCallback, err: PositionErrorCallback) => void) =>
    ({ getCurrentPosition: vi.fn(impl) }) as unknown as Geolocation;

  it.each([[1, 'denied'], [2, 'unavailable'], [3, 'timeout']] as const)('maps error code %i to %s', async (code, reason) => {
    const err = await getBrowserPosition(geo((_ok, fail) => fail({ code } as GeolocationPositionError)), true).catch((e) => e);
    expect(err).toBeInstanceOf(GpsError);
    expect(err.reason).toBe(reason);
  });

  it('refuses without geolocation or on an insecure page', async () => {
    expect((await getBrowserPosition(undefined, true).catch((e) => e)).reason).toBe('unsupported');
    const g = geo(() => {});
    expect((await getBrowserPosition(g, false).catch((e) => e)).reason).toBe('insecure');
    expect(g.getCurrentPosition).not.toHaveBeenCalled();
  });

  it('returns coordinates rounded to ~110 m, never the exact fix', async () => {
    const pos = await getBrowserPosition(
      geo((succeed) => succeed({ coords: { latitude: 13.339187, longitude: 77.113954 } } as GeolocationPosition)), true
    );
    expect(pos).toEqual({ lat: 13.339, lng: 77.114 });
  });
});
