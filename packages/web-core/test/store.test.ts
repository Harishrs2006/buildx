import { describe, it, expect, vi } from 'vitest';
import { createLocationStore, LOCATION_STORAGE_KEY, LOCATION_MAX_AGE_MS } from '../src/location/store';
import { memoryStorage } from './helpers';

const NOW = Date.parse('2026-10-11T00:00:00Z');
const stored = (over: Record<string, unknown> = {}) =>
  JSON.stringify({ v: 1, pincode: '572103', label: 'Kuvempunagar S.O, TUMAKURU, KARNATAKA', source: 'manual', savedAt: new Date(NOW - 1000).toISOString(), ...over });

describe('location store', () => {
  it('persists only PIN, label, source and time — no coordinates, no serviceability', () => {
    const storage = memoryStorage();
    const store = createLocationStore({ storage, now: () => NOW, syncAcrossTabs: false });
    store.set({ pincode: '572103', label: 'Tumakuru', source: 'gps' });
    const saved = JSON.parse(storage.raw.get(LOCATION_STORAGE_KEY)!);
    expect(Object.keys(saved).sort()).toEqual(['label', 'pincode', 'savedAt', 'source', 'v']);
    expect(saved).toMatchObject({ v: 1, pincode: '572103', source: 'gps' });
  });

  it('restores a valid saved location', () => {
    const store = createLocationStore({ storage: memoryStorage({ [LOCATION_STORAGE_KEY]: stored() }), now: () => NOW, syncAcrossTabs: false });
    expect(store.get()).toMatchObject({ pincode: '572103', source: 'manual' });
    expect(store.get()).toBe(store.get()); // stable snapshot for useSyncExternalStore
  });

  it.each([
    ['not JSON', '{oops'],
    ['wrong version', stored({ v: 2 })],
    ['bad PIN', stored({ pincode: '072103' })],
    ['extra fields like coordinates', stored({ lat: 13.33, lng: 77.11 })],
    ['a stored serviceability claim', stored({ serviceable: true })],
    ['outdated', stored({ savedAt: new Date(NOW - LOCATION_MAX_AGE_MS - 1).toISOString() })],
    ['from the future', stored({ savedAt: new Date(NOW + 86_400_000).toISOString() })],
    ['wrong types', JSON.stringify({ v: 1, pincode: 572103, label: 1, source: 'x', savedAt: 'yesterday' })],
  ])('discards malformed or outdated data (%s)', (_label, raw) => {
    const storage = memoryStorage({ [LOCATION_STORAGE_KEY]: raw });
    const store = createLocationStore({ storage, now: () => NOW, syncAcrossTabs: false });
    expect(store.get()).toBeNull();
    expect(storage.raw.has(LOCATION_STORAGE_KEY)).toBe(false);
  });

  it('keeps working in memory when storage is blocked or full', () => {
    const storage = {
      getItem: vi.fn(() => { throw new Error('SecurityError'); }),
      setItem: vi.fn(() => { throw new Error('QuotaExceededError'); }),
      removeItem: vi.fn(() => { throw new Error('SecurityError'); }),
    };
    const store = createLocationStore({ storage, now: () => NOW, syncAcrossTabs: false });
    expect(store.get()).toBeNull();
    store.set({ pincode: '560001', label: 'Bengaluru', source: 'manual' });
    expect(store.get()).toMatchObject({ pincode: '560001' });
    store.clear();
    expect(store.get()).toBeNull();
  });

  it('notifies subscribers, including for changes made in another tab', () => {
    const storage = memoryStorage();
    const store = createLocationStore({ storage, now: () => NOW });
    const listener = vi.fn();
    store.subscribe(listener);
    store.set({ pincode: '572103', label: 'x', source: 'manual' });
    expect(listener).toHaveBeenCalledTimes(1);

    storage.raw.set(LOCATION_STORAGE_KEY, stored({ pincode: '560001' }));
    window.dispatchEvent(new StorageEvent('storage', { key: LOCATION_STORAGE_KEY }));
    expect(listener).toHaveBeenCalledTimes(2);
    expect(store.get()?.pincode).toBe('560001');
  });

  it('refuses to save an invalid PIN', () => {
    const store = createLocationStore({ storage: memoryStorage(), syncAcrossTabs: false });
    expect(() => store.set({ pincode: '12345', label: 'x', source: 'manual' })).toThrow();
  });
});
