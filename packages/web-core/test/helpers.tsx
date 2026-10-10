import { vi } from 'vitest';
import { render, renderHook, type RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { createApiClient } from '../src/api/client';
import { createLocationStore } from '../src/location/store';
import { WebCoreProvider } from '../src/context';

export const BASE = 'https://api.test/api/v1';

// Responses shaped exactly like the API source (verified against the real API in
// apps/api/test/web-contract.test.ts). Values are synthetic.
export const postal = (pincode: string, district = 'TUMAKURU', state = 'KARNATAKA') => ({
  pincode,
  district,
  state,
  districts: [district],
  hasDeliveryOffice: true,
  postOffices: [
    { name: 'R G Market S.O', officeType: 'S.O', deliveryStatus: 'Non-Delivery' },
    { name: 'Kuvempunagar S.O', officeType: 'S.O', deliveryStatus: 'Delivery' },
  ],
  approxLocation: null,
  source: { attribution: 'All India Pincode Directory, Department of Posts', datasetVersion: 'test-1' },
});
export const svc = (pincode: string, supplierCount: number, district = 'TUMAKURU', state = 'KARNATAKA') => ({
  pincode, district, state, serviceable: supplierCount > 0, supplierCount,
  ...(supplierCount === 0 ? { reason: 'NO_SUPPLIERS' } : {}),
});

export const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });
export const ok = (data: unknown) => json({ success: true, data });
export const apiError = (status: number, code: string, message = code, headers: Record<string, string> = {}) =>
  json({ success: false, error: { code, message } }, status, headers);

type Handler = (url: URL, init: RequestInit) => Response | Promise<Response>;

/** fetch mock routed by "METHOD /path" (path without the /api/v1 prefix) */
export function mockApi(routes: Record<string, Handler | Response>) {
  const fn = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = new URL(String(input));
    const key = `${init.method ?? 'GET'} ${url.pathname.replace('/api/v1', '')}`;
    const route = routes[key];
    if (!route) throw new Error(`Unmocked request: ${key}`);
    const res = typeof route === 'function' ? await route(url, init) : route.clone();
    if (init.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    return res;
  });
  return fn;
}

/** Standard happy-path API for a PIN served by `count` suppliers */
export function locationRoutes(pins: Record<string, number | 'not-found'>): Record<string, Handler> {
  const routes: Record<string, Handler> = {};
  for (const [pin, count] of Object.entries(pins)) {
    routes[`GET /locations/pincode/${pin}`] = () => (count === 'not-found' ? apiError(404, 'PINCODE_NOT_FOUND') : ok(postal(pin)));
    routes[`GET /locations/pincode/${pin}/serviceability`] = () =>
      count === 'not-found' ? apiError(404, 'PINCODE_NOT_FOUND') : ok(svc(pin, count));
  }
  return routes;
}

export function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

export function memoryStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: vi.fn((k: string) => (map.has(k) ? map.get(k)! : null)),
    setItem: vi.fn((k: string, v: string) => { map.set(k, v); }),
    removeItem: vi.fn((k: string) => { map.delete(k); }),
    raw: map,
  };
}

export function setup(fetchMock: ReturnType<typeof mockApi>, storage = memoryStorage()) {
  const client = createApiClient({ baseUrl: BASE, fetch: fetchMock as unknown as typeof fetch });
  const store = createLocationStore({ storage, syncAcrossTabs: false });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <WebCoreProvider client={client} locationStore={store}>{children}</WebCoreProvider>
  );
  return {
    client,
    store,
    storage,
    user: userEvent.setup(),
    render: (ui: ReactNode, opts?: RenderOptions) => render(ui, { wrapper, ...opts }),
    renderHook: <T,>(hook: () => T) => renderHook(hook, { wrapper }),
  };
}
