import { describe, it, expect, vi, afterEach } from 'vitest';
import { screen, waitFor, act } from '@testing-library/react';
import { LocationSelector } from '../src/location/LocationSelector';
import { useLocationSelector, useDeliveryServiceability } from '../src/location/hooks';
import { GpsError } from '../src/location/lookup';
import { LOCATION_STORAGE_KEY } from '../src/location/store';
import {
  setup, mockApi, locationRoutes, ok, apiError, postal, svc, deferred, memoryStorage, json,
} from './helpers';

const pinInput = () => screen.getByRole('textbox', { name: 'PIN code' });
const savedLocation = (pincode: string) =>
  JSON.stringify({ v: 1, pincode, label: `Somewhere ${pincode}`, source: 'manual', savedAt: new Date().toISOString() });

afterEach(() => vi.unstubAllGlobals());

describe('LocationSelector — manual PIN entry', () => {
  it('valid PIN with delivery: saves it and says BuildX delivers there', async () => {
    const onChange = vi.fn();
    const t = setup(mockApi(locationRoutes({ '572103': 2 })));
    t.render(<LocationSelector onLocationChange={onChange} />);

    await t.user.type(pinInput(), '572103{Enter}');

    expect(await screen.findByText(/BuildX delivers here · 2 suppliers/)).toBeTruthy();
    expect(screen.getByText('572103')).toBeTruthy();
    expect(t.store.get()).toMatchObject({ pincode: '572103', source: 'manual', label: 'Kuvempunagar S.O, TUMAKURU, KARNATAKA' });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ pincode: '572103' }));
    // Focus returns to the "Change" control after choosing
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /Change delivery location/ }));
  });

  it('valid PIN with no suppliers: remembered, but clearly not deliverable', async () => {
    const t = setup(mockApi(locationRoutes({ '110001': 0 })));
    t.render(<LocationSelector />);
    await t.user.type(pinInput(), '110001{Enter}');
    expect(await screen.findByText("BuildX doesn't deliver to 110001 yet.")).toBeTruthy();
    expect(screen.queryByText(/delivers here/)).toBeNull();
    expect(t.store.get()?.pincode).toBe('110001');
  });

  it('unknown PIN: explained, nothing saved', async () => {
    const t = setup(mockApi(locationRoutes({ '999999': 'not-found' })));
    t.render(<LocationSelector />);
    await t.user.type(pinInput(), '999999{Enter}');
    expect(await screen.findByText(/isn't in the India Post directory/)).toBeTruthy();
    expect(t.store.get()).toBeNull();
  });

  it.each([
    ['12ab56', 'A PIN code can only contain digits'],
    ['57210', 'A PIN code has exactly 6 digits'],
    ['072103', "PIN codes don't start with 0"],
    ['', 'Enter your 6-digit PIN code'],
  ])('invalid input %j: accessible error, no request', async (typed, message) => {
    const api = mockApi({});
    const t = setup(api);
    t.render(<LocationSelector />);
    if (typed) await t.user.type(pinInput(), typed);
    await t.user.click(screen.getByRole('button', { name: 'Check PIN' }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toBe(message);
    expect(pinInput().getAttribute('aria-invalid')).toBe('true');
    expect(pinInput().getAttribute('aria-describedby')).toContain(alert.id);
    expect(api).not.toHaveBeenCalled();
  });

  it('API failure: no delivery claim; retry, or browse on without a check', async () => {
    let svcUp = false;
    const t = setup(mockApi({
      'GET /locations/pincode/572103': () => ok(postal('572103')),
      'GET /locations/pincode/572103/serviceability': () =>
        svcUp ? ok(svc('572103', 1)) : apiError(503, 'LOOKUP_UNAVAILABLE', 'down', { 'Retry-After': '30' }),
    }));
    t.render(<LocationSelector />);
    await t.user.type(pinInput(), '572103{Enter}');

    expect(await screen.findByText(/couldn't check delivery for this PIN right now/)).toBeTruthy();
    expect(screen.queryByText(/delivers here/)).toBeNull();
    expect(t.store.get()).toBeNull();

    // Browse on without a claim → saved, and the summary still makes no claim
    await t.user.click(screen.getByRole('button', { name: 'Continue browsing without a delivery check' }));
    expect(t.store.get()?.pincode).toBe('572103');
    expect(await screen.findByText(/Couldn't confirm delivery right now/)).toBeTruthy();
    expect(screen.queryByText(/delivers here/)).toBeNull();

    // Service recovers → a re-check (not a cached answer) is what turns it positive
    svcUp = true;
    await t.user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText(/BuildX delivers here · 1 supplier$/)).toBeTruthy();
  });

  it('change location: Change opens the form with focus; Escape cancels; a new PIN replaces the old', async () => {
    const t = setup(mockApi(locationRoutes({ '572103': 2, '560001': 3 })), memoryStorage({ [LOCATION_STORAGE_KEY]: savedLocation('572103') }));
    t.render(<LocationSelector />);
    await screen.findByText(/BuildX delivers here · 2 suppliers/);

    await t.user.click(screen.getByRole('button', { name: /Change delivery location \(currently 572103\)/ }));
    expect(document.activeElement).toBe(pinInput());
    await t.user.keyboard('{Escape}');
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(t.store.get()?.pincode).toBe('572103');

    await t.user.click(screen.getByRole('button', { name: /Change delivery location/ }));
    await t.user.type(pinInput(), '560001{Enter}');
    expect(await screen.findByText(/BuildX delivers here · 3 suppliers/)).toBeTruthy();
    expect(t.store.get()?.pincode).toBe('560001');
  });
});

describe('LocationSelector — stored location', () => {
  it('ignores malformed browser storage and starts fresh', async () => {
    const storage = memoryStorage({ [LOCATION_STORAGE_KEY]: '{"v":1,"pincode":"572103","lat":13.3' });
    const api = mockApi({});
    const t = setup(api, storage);
    t.render(<LocationSelector />);
    expect(pinInput()).toBeTruthy();
    expect(storage.raw.has(LOCATION_STORAGE_KEY)).toBe(false);
    expect(api).not.toHaveBeenCalled();
  });

  it('re-checks a previously chosen PIN instead of trusting the past', async () => {
    const t = setup(mockApi(locationRoutes({ '572103': 0 })), memoryStorage({ [LOCATION_STORAGE_KEY]: savedLocation('572103') }));
    t.render(<LocationSelector />);
    expect(await screen.findByText("BuildX doesn't deliver to 572103 yet.")).toBeTruthy();
  });
});

describe('LocationSelector — GPS', () => {
  const reverseOk = (pincode = '572103') => ok({
    pincode,
    detected: { locality: 'Kuvempunagar', district: 'Tumakuru', state: 'Karnataka' },
    postalStatus: 'VALID',
    postal: postal(pincode),
    requiresConfirmation: true,
  });

  it('never asks for location on load', () => {
    const getCurrentPosition = vi.fn();
    vi.stubGlobal('navigator', { ...navigator, geolocation: { getCurrentPosition } });
    const t = setup(mockApi({}));
    t.render(<LocationSelector />);
    expect(getCurrentPosition).not.toHaveBeenCalled();
  });

  it('requires confirmation before using a GPS-derived PIN', async () => {
    const api = mockApi({ 'POST /locations/reverse': () => reverseOk(), ...locationRoutes({ '572103': 2 }) });
    const t = setup(api);
    t.render(<LocationSelector getPosition={async () => ({ lat: 13.339, lng: 77.114 })} />);

    await t.user.click(screen.getByRole('button', { name: 'Use my current location' }));
    const yes = await screen.findByRole('button', { name: 'Yes, use 572103' });
    expect(screen.getByText(/Your location looks like PIN/).textContent).toContain('Kuvempunagar, Tumakuru, Karnataka');
    expect(document.activeElement).toBe(yes);
    expect(t.store.get()).toBeNull(); // nothing accepted yet

    // Only the rounded coordinates were sent, to our API (not Google)
    const [url, init] = api.mock.calls[0];
    expect(String(url)).toBe('https://api.test/api/v1/locations/reverse');
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ lat: 13.339, lng: 77.114 });

    await t.user.click(yes);
    expect(await screen.findByText(/BuildX delivers here · 2 suppliers/)).toBeTruthy();
    expect(t.store.get()).toMatchObject({ pincode: '572103', source: 'gps' });
    expect(JSON.stringify(t.storage.raw.get(LOCATION_STORAGE_KEY))).not.toMatch(/13\.33|77\.11/);
  });

  it('rejecting the GPS PIN returns to manual entry and saves nothing', async () => {
    const t = setup(mockApi({ 'POST /locations/reverse': () => reverseOk() }));
    t.render(<LocationSelector getPosition={async () => ({ lat: 13.339, lng: 77.114 })} />);
    await t.user.click(screen.getByRole('button', { name: 'Use my current location' }));
    await t.user.click(await screen.findByRole('button', { name: "No, I'll enter my PIN" }));
    expect(pinInput()).toBeTruthy();
    expect(t.store.get()).toBeNull();
  });

  it('permission denied: explains, and manual entry still works', async () => {
    const t = setup(mockApi(locationRoutes({ '560001': 1 })));
    t.render(<LocationSelector getPosition={() => Promise.reject(new GpsError('denied'))} />);
    await t.user.click(screen.getByRole('button', { name: 'Use my current location' }));
    expect(await screen.findByText(/Location permission was denied/)).toBeTruthy();

    await t.user.type(pinInput(), '560001{Enter}');
    expect(await screen.findByText(/BuildX delivers here · 1 supplier/)).toBeTruthy();
  });

  it.each([
    ['GPS unavailable', () => Promise.reject(new GpsError('unavailable')), {}, /couldn't get your location/],
    ['GPS timeout', () => Promise.reject(new GpsError('timeout')), {}, /took too long/],
    ['lookup service down', async () => ({ lat: 13.339, lng: 77.114 }), { 'POST /locations/reverse': () => apiError(503, 'GEOLOCATION_UNAVAILABLE') }, /couldn't look up your location/],
    ['outside India', async () => ({ lat: 27.717, lng: 85.324 }), { 'POST /locations/reverse': () => apiError(422, 'OUTSIDE_INDIA') }, /outside India/],
    ['no PIN found', async () => ({ lat: 13.339, lng: 77.114 }), { 'POST /locations/reverse': () => apiError(404, 'LOCATION_NOT_RESOLVED') }, /couldn't find a PIN code/],
  ])('%s: explains and leaves manual entry available', async (_label, getPosition, routes, message) => {
    const t = setup(mockApi(routes as Parameters<typeof mockApi>[0]));
    t.render(<LocationSelector getPosition={getPosition as () => Promise<{ lat: number; lng: number }>} />);
    await t.user.click(screen.getByRole('button', { name: 'Use my current location' }));
    expect(await screen.findByText(message)).toBeTruthy();
    expect((pinInput() as HTMLInputElement).disabled).toBe(false);
    expect(t.store.get()).toBeNull();
  });

  it('hides the GPS button when disabled by the app', () => {
    const t = setup(mockApi({}));
    t.render(<LocationSelector allowGps={false} />);
    expect(screen.queryByRole('button', { name: 'Use my current location' })).toBeNull();
  });
});

describe('requests superseded by a newer PIN', () => {
  it('a slow answer for the old PIN never wins', async () => {
    const slow = deferred<Response>();
    const t = setup(mockApi({
      'GET /locations/pincode/572103': () => slow.promise,
      'GET /locations/pincode/572103/serviceability': () => slow.promise.then((r) => r.clone()),
      ...locationRoutes({ '560001': 1 }),
    }));
    const { result } = t.renderHook(() => useLocationSelector());

    let first!: Promise<void>;
    act(() => { first = result.current.submitPincode('572103'); });
    await act(() => result.current.submitPincode('560001'));
    expect(result.current.state).toMatchObject({ phase: 'result', check: { status: 'serviceable', pincode: '560001' } });

    // The old PIN's responses arrive late
    await act(async () => { slow.resolve(ok(postal('572103'))); await first; });
    expect(result.current.state).toMatchObject({ phase: 'result', check: { pincode: '560001' } });
    expect(t.store.get()?.pincode).toBe('560001');
  });

  it('delivery status follows the newest selected PIN', async () => {
    const slow = deferred<Response>();
    const t = setup(mockApi({
      'GET /locations/pincode/572103/serviceability': () => slow.promise,
      'GET /locations/pincode/560001/serviceability': () => ok(svc('560001', 0, 'BENGALURU URBAN')),
    }));
    const { result } = t.renderHook(() => useDeliveryServiceability());
    act(() => { t.store.set({ pincode: '572103', label: 'a', source: 'manual' }); });
    act(() => { t.store.set({ pincode: '560001', label: 'b', source: 'manual' }); });
    await waitFor(() => expect(result.current.status).toBe('not-serviceable'));
    await act(async () => { slow.resolve(ok(svc('572103', 5))); });
    expect(result.current).toMatchObject({ status: 'not-serviceable', pincode: '560001' });
  });
});

// Keep the helper import used even if a route set is empty in some runs
void json;
