import { z } from 'zod';
import { PINCODE_RE } from './pincode';

// The buyer's chosen delivery location, remembered in the browser.
// Stored: PIN, a short display label, how it was chosen, when. NOT stored: coordinates
// (GPS positions are discarded after the PIN is confirmed) or serviceability (it can change at
// any time, so it is always re-checked — see useDeliveryServiceability / verifyDeliveryForCheckout).

export const LOCATION_STORAGE_KEY = 'buildx.deliveryLocation';
const STORAGE_VERSION = 1;
export const LOCATION_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000; // forget after 90 days

export type SelectedLocation = {
  pincode: string;
  label: string;           // e.g. "Kuvempunagar S.O, TUMAKURU, KARNATAKA"
  source: 'manual' | 'gps';
  savedAt: string;         // ISO time
};

const storedSchema = z.object({
  v: z.literal(STORAGE_VERSION),
  pincode: z.string().regex(PINCODE_RE),
  label: z.string().max(160),
  source: z.enum(['manual', 'gps']),
  savedAt: z.string().datetime(),
}).strict(); // anything extra (e.g. coordinates from some older code) is rejected

export type LocationStore = {
  get(): SelectedLocation | null;
  set(location: { pincode: string; label: string; source: 'manual' | 'gps' }): SelectedLocation;
  clear(): void;
  subscribe(listener: () => void): () => void;
};

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function defaultStorage(): StorageLike | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null; // e.g. storage blocked by browser settings
  }
}

export function createLocationStore(options: {
  storage?: StorageLike | null;
  key?: string;
  now?: () => number;
  /** Listen for changes made in other tabs (browser only) */
  syncAcrossTabs?: boolean;
} = {}): LocationStore {
  const storage = options.storage === undefined ? defaultStorage() : options.storage;
  const key = options.key ?? LOCATION_STORAGE_KEY;
  const now = options.now ?? Date.now;
  const listeners = new Set<() => void>();
  let memory: SelectedLocation | null = null; // used when storage is missing or failing
  let memoryOnly = !storage;
  let cached: { raw: string | null; value: SelectedLocation | null } | undefined;

  const safe = <T>(fn: () => T, fallback: T): T => {
    try { return fn(); } catch { return fallback; }
  };

  function read(): SelectedLocation | null {
    if (!storage || memoryOnly) return memory;
    const raw = safe(() => storage.getItem(key), null);
    // Keep the returned object stable while storage is unchanged (useSyncExternalStore needs it)
    if (cached && cached.raw === raw) return cached.value;

    let value: SelectedLocation | null = null;
    if (raw !== null) {
      const parsed = safe(() => storedSchema.safeParse(JSON.parse(raw)), storedSchema.safeParse(null));
      const fresh = parsed.success && now() - Date.parse(parsed.data.savedAt) <= LOCATION_MAX_AGE_MS
        && Date.parse(parsed.data.savedAt) <= now() + 60_000;
      if (parsed.success && fresh) {
        const { v: _v, ...loc } = parsed.data;
        value = loc;
      } else {
        // Malformed, from another version, or outdated: discard it
        safe(() => storage.removeItem(key), undefined);
      }
    }
    cached = { raw: value ? raw : null, value };
    return value;
  }

  const notify = () => listeners.forEach((l) => l());

  if (options.syncAcrossTabs !== false && typeof window !== 'undefined' && storage) {
    window.addEventListener('storage', (e) => {
      if (e.key === key) notify();
    });
  }

  return {
    get: read,
    set(location) {
      if (!PINCODE_RE.test(location.pincode)) throw new Error('Invalid PIN code');
      const value: SelectedLocation = {
        pincode: location.pincode,
        label: location.label.slice(0, 160),
        source: location.source,
        savedAt: new Date(now()).toISOString(),
      };
      memory = value;
      if (storage && !memoryOnly) {
        const saved = safe(() => { storage.setItem(key, JSON.stringify({ v: STORAGE_VERSION, ...value })); return true; }, false);
        if (!saved) memoryOnly = true; // full/blocked storage: keep it for this page session only
      }
      notify();
      return value;
    },
    clear() {
      memory = null;
      if (storage) safe(() => storage.removeItem(key), undefined);
      notify();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
