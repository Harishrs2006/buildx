import { describe, it, expect } from 'vitest';
import { act, waitFor } from '@testing-library/react';
import { useProductsForLocation } from '../src/products/products';
import { verifyDeliveryForCheckout } from '../src/location/hooks';
import { setup, mockApi, json, ok, apiError, svc, deferred } from './helpers';

const product = (id: string) => ({ _id: id, name: `Cement ${id}`, unit: 'BAG', basePrice: 400, extra: 'kept' });
const list = (ids: string[], pincode?: string, supplierCount = 1) => json({
  products: ids.map(product),
  pagination: { page: 1, limit: 20, total: ids.length, pages: 1 },
  ...(pincode ? { location: svc(pincode, supplierCount) } : {}),
});

describe('useProductsForLocation', () => {
  it('fetches products for the selected PIN and tags results with it', async () => {
    const api = mockApi({ 'GET /products': (url) => list(['a1'], url.searchParams.get('pincode') ?? undefined) });
    const t = setup(api);
    t.store.set({ pincode: '572103', label: 'x', source: 'manual' });
    const { result } = t.renderHook(() => useProductsForLocation({ category: 'cement', q: 'opc', page: 2 }));

    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.pincode).toBe('572103');
    expect(result.current.data?.products[0]).toMatchObject({ _id: 'a1', extra: 'kept' });
    const url = new URL(String(api.mock.calls[0][0]));
    expect(Object.fromEntries(url.searchParams)).toEqual({ category: 'cement', q: 'opc', page: '2', pincode: '572103' });
  });

  it('without a selected PIN, browses the unfiltered catalogue', async () => {
    const api = mockApi({ 'GET /products': () => list(['a1', 'b1']) });
    const t = setup(api);
    const { result } = t.renderHook(() => useProductsForLocation());
    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.pincode).toBeNull();
    expect(new URL(String(api.mock.calls[0][0])).searchParams.has('pincode')).toBe(false);
  });

  it('refreshes when the PIN changes and never lets the old PIN overwrite the new results', async () => {
    const slowOld = deferred<Response>();
    const api = mockApi({
      'GET /products': (url) => (url.searchParams.get('pincode') === '572103' ? slowOld.promise : list(['b1', 'b2'], '560001', 2)),
    });
    const t = setup(api);
    t.store.set({ pincode: '572103', label: 'x', source: 'manual' });
    const { result } = t.renderHook(() => useProductsForLocation());
    expect(result.current).toMatchObject({ status: 'loading', pincode: '572103' });

    act(() => { t.store.set({ pincode: '560001', label: 'y', source: 'manual' }); });
    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.pincode).toBe('560001');
    expect(result.current.data?.products.map((p) => p._id)).toEqual(['b1', 'b2']);

    // The superseded request was aborted, and its late answer is ignored
    const oldInit = api.mock.calls[0][1] as RequestInit;
    expect(oldInit.signal?.aborted).toBe(true);
    await act(async () => { slowOld.resolve(list(['a1'], '572103')); });
    expect(result.current.pincode).toBe('560001');
    expect(result.current.data?.products.map((p) => p._id)).toEqual(['b1', 'b2']);
  });

  it('ignores a late old-PIN answer even if the network layer ignores cancellation', async () => {
    const slowOld = deferred<Response>();
    // Unlike mockApi, this fetch never honours the abort signal
    const stubborn = async (input: RequestInfo | URL) => {
      const pin = new URL(String(input)).searchParams.get('pincode');
      return pin === '572103' ? slowOld.promise : list(['b1'], '560001');
    };
    const t = setup(stubborn as unknown as ReturnType<typeof mockApi>);
    t.store.set({ pincode: '572103', label: 'x', source: 'manual' });
    const { result } = t.renderHook(() => useProductsForLocation());
    act(() => { t.store.set({ pincode: '560001', label: 'y', source: 'manual' }); });
    await waitFor(() => expect(result.current.status).toBe('success'));

    await act(async () => { slowOld.resolve(list(['a1'], '572103')); await slowOld.promise; });
    await new Promise((r) => setTimeout(r, 0));
    expect(result.current.pincode).toBe('560001');
    expect(result.current.data?.products.map((p) => p._id)).toEqual(['b1']);
  });

  it('reports errors and refuses a response for a different PIN', async () => {
    const t = setup(mockApi({ 'GET /products': () => list(['a1'], '110001') }));
    t.store.set({ pincode: '572103', label: 'x', source: 'manual' });
    const { result } = t.renderHook(() => useProductsForLocation());
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.status === 'error' && (result.current.error as { code?: string }).code).toBe('INVALID_RESPONSE');
  });
});

describe('verifyDeliveryForCheckout', () => {
  it('always asks the server afresh (no HTTP cache)', async () => {
    const api = mockApi({ 'GET /locations/pincode/572103/serviceability': () => ok(svc('572103', 2)) });
    const t = setup(api);
    expect(await verifyDeliveryForCheckout(t.client, '572103')).toEqual({ deliverable: true, pincode: '572103', supplierCount: 2 });
    await verifyDeliveryForCheckout(t.client, '572103');
    expect(api).toHaveBeenCalledTimes(2);
    expect(api.mock.calls.every(([, init]) => (init as RequestInit).cache === 'no-store')).toBe(true);
  });

  it.each([
    ['no suppliers', () => ok(svc('572103', 0)), 'NO_SUPPLIERS'],
    ['unknown PIN', () => apiError(404, 'PINCODE_NOT_FOUND'), 'NOT_FOUND'],
    ['service down', () => apiError(503, 'LOOKUP_UNAVAILABLE'), 'UNAVAILABLE'],
    ['network error', () => { throw new TypeError('down'); }, 'UNAVAILABLE'],
    ['malformed answer', () => ok({ ...svc('572103', 1), serviceable: 1 }), 'UNAVAILABLE'],
  ])('%s → not deliverable (%s)', async (_label, handler, reason) => {
    const t = setup(mockApi({ 'GET /locations/pincode/572103/serviceability': handler as () => Response }));
    expect(await verifyDeliveryForCheckout(t.client, '572103')).toMatchObject({ deliverable: false, reason });
  });

  it('rejects a malformed PIN without a request', async () => {
    const api = mockApi({});
    const t = setup(api);
    expect(await verifyDeliveryForCheckout(t.client, '5721')).toMatchObject({ deliverable: false, reason: 'INVALID' });
    expect(api).not.toHaveBeenCalled();
  });
});
