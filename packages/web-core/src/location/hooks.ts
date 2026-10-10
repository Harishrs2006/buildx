'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { ApiClientError, isAbortError, type ApiClient } from '../api/client';
import { useApiClient, useLocationStore } from '../context';
import {
  checkPincode, describePlace, fetchServiceability, getBrowserPosition, gpsCandidate, GpsError, GPS_MESSAGES,
  reverseGeocode, reverseFailureMessage, type GpsCandidate, type LocationCheck,
} from './lookup';
import { validatePincode } from './pincode';
import type { SelectedLocation } from './store';

// ─── Selected location ──────────────────────────────────────────────────────

/** The buyer's remembered delivery location (null on the server and when none is chosen). */
export function useSelectedLocation(): SelectedLocation | null {
  const store = useLocationStore();
  return useSyncExternalStore(store.subscribe, store.get, () => null);
}

// ─── Serviceability of the selected location (always re-checked) ───────────

export type DeliveryStatus =
  | { status: 'none' }
  | { status: 'checking'; pincode: string }
  | { status: 'serviceable'; pincode: string; supplierCount: number }
  | { status: 'not-serviceable'; pincode: string }
  | { status: 'unavailable'; pincode: string; message: string };

/**
 * Re-checks the selected PIN's serviceability whenever it changes or `recheck()` is called.
 * A stored location is never assumed to still be serviceable.
 */
export function useDeliveryServiceability(): DeliveryStatus & { recheck: () => void } {
  const client = useApiClient();
  const location = useSelectedLocation();
  const pincode = location?.pincode ?? null;
  const [nonce, setNonce] = useState(0);
  const [state, setState] = useState<DeliveryStatus>({ status: 'none' });

  useEffect(() => {
    if (!pincode) { setState({ status: 'none' }); return; }
    const controller = new AbortController();
    setState({ status: 'checking', pincode });
    fetchServiceability(client, pincode, controller.signal, nonce > 0 ? 'no-store' : undefined)
      .then((s) => {
        if (controller.signal.aborted) return;
        if (s.pincode !== pincode) {
          setState({ status: 'unavailable', pincode, message: "Couldn't confirm delivery right now" });
        } else {
          setState(s.serviceable ? { status: 'serviceable', pincode, supplierCount: s.supplierCount } : { status: 'not-serviceable', pincode });
        }
      })
      .catch((err) => {
        if (controller.signal.aborted || isAbortError(err)) return;
        setState({ status: 'unavailable', pincode, message: "Couldn't confirm delivery right now" });
      });
    return () => controller.abort();
  }, [client, pincode, nonce]);

  const recheck = useCallback(() => setNonce((n) => n + 1), []);
  return { ...state, recheck };
}

export type CheckoutDeliveryCheck =
  | { deliverable: true; pincode: string; supplierCount: number }
  | { deliverable: false; pincode: string; reason: 'INVALID' | 'NOT_FOUND' | 'NO_SUPPLIERS' | 'UNAVAILABLE'; message: string };

/**
 * Fresh, uncached check to run before showing checkout. Advisory only: the API re-checks the
 * supplier's coverage again inside the order transaction, which is the final word.
 */
export async function verifyDeliveryForCheckout(client: ApiClient, pincode: string, signal?: AbortSignal): Promise<CheckoutDeliveryCheck> {
  const v = validatePincode(pincode);
  if (!v.valid) return { deliverable: false, pincode, reason: 'INVALID', message: v.message };
  try {
    const s = await fetchServiceability(client, v.pincode, signal, 'no-store');
    if (s.pincode === v.pincode && s.serviceable) return { deliverable: true, pincode: v.pincode, supplierCount: s.supplierCount };
    if (s.pincode !== v.pincode) throw new ApiClientError('Mismatched response', 'INVALID_RESPONSE', null);
    return { deliverable: false, pincode: v.pincode, reason: 'NO_SUPPLIERS', message: `BuildX doesn't deliver to ${v.pincode} yet.` };
  } catch (err) {
    if (isAbortError(err)) throw err;
    if (err instanceof ApiClientError && err.code === 'PINCODE_NOT_FOUND') {
      return { deliverable: false, pincode: v.pincode, reason: 'NOT_FOUND', message: `PIN code ${v.pincode} isn't in the India Post directory.` };
    }
    return { deliverable: false, pincode: v.pincode, reason: 'UNAVAILABLE', message: "We couldn't confirm delivery right now. Please try again." };
  }
}

// ─── Selector state machine (headless) ──────────────────────────────────────

export type SelectorState =
  | { phase: 'idle' }
  | { phase: 'checking'; pincode: string; source: 'manual' | 'gps' }
  | { phase: 'result'; check: LocationCheck; source: 'manual' | 'gps' }
  | { phase: 'locating' }
  | { phase: 'gps-confirm'; candidate: GpsCandidate }
  | { phase: 'gps-failed'; message: string };

export type UseLocationSelectorOptions = {
  /** Called after a location is chosen and saved */
  onSelected?: (location: SelectedLocation) => void;
  /** Injectable for tests; defaults to the browser's geolocation */
  getPosition?: () => Promise<{ lat: number; lng: number }>;
};

/**
 * Drives the location selector. Each new action supersedes the previous one: older requests
 * are aborted and their results ignored, so a slow answer for an old PIN can't win.
 */
export function useLocationSelector(options: UseLocationSelectorOptions = {}) {
  const client = useApiClient();
  const store = useLocationStore();
  const [state, setState] = useState<SelectorState>({ phase: 'idle' });
  const active = useRef<{ id: number; controller: AbortController } | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const begin = () => {
    active.current?.controller.abort();
    const next = { id: (active.current?.id ?? 0) + 1, controller: new AbortController() };
    active.current = next;
    return next;
  };
  const isCurrent = (op: { id: number }) => active.current?.id === op.id && !active.current.controller.signal.aborted;
  useEffect(() => () => active.current?.controller.abort(), []);

  const save = useCallback((pincode: string, label: string, source: 'manual' | 'gps') => {
    const saved = store.set({ pincode, label: label || `PIN ${pincode}`, source });
    optionsRef.current.onSelected?.(saved);
    return saved;
  }, [store]);

  const runCheck = useCallback(async (input: string, source: 'manual' | 'gps') => {
    const op = begin();
    const v = validatePincode(input);
    if (!v.valid) {
      setState({ phase: 'result', source, check: { status: 'invalid', input, message: v.message } });
      return;
    }
    setState({ phase: 'checking', pincode: v.pincode, source });
    try {
      const check = await checkPincode(client, v.pincode, op.controller.signal);
      if (!isCurrent(op)) return;
      setState({ phase: 'result', check, source });
      // A real PIN is remembered even if we don't deliver there yet (so browsing can show it),
      // but serviceability itself is never stored
      if (check.status === 'serviceable' || check.status === 'not-serviceable') {
        save(check.pincode, describePlace(check.place), source);
      }
    } catch (err) {
      if (!isCurrent(op) || isAbortError(err)) return;
      setState({
        phase: 'result',
        source,
        check: { status: 'unavailable', pincode: v.pincode, place: null, message: "We couldn't check this PIN right now. Please try again." },
      });
    }
  }, [client, save]);

  /** Check a typed PIN */
  const submitPincode = useCallback((input: string) => runCheck(input, 'manual'), [runCheck]);

  /** Start the GPS flow — only ever call from a user action */
  const requestCurrentLocation = useCallback(async () => {
    const op = begin();
    setState({ phase: 'locating' });
    try {
      const coords = await (optionsRef.current.getPosition ?? (() => getBrowserPosition()))();
      if (!isCurrent(op)) return;
      const result = await reverseGeocode(client, coords, op.controller.signal);
      if (!isCurrent(op)) return;
      // Coordinates are dropped here; only the candidate PIN goes forward, pending confirmation
      setState({ phase: 'gps-confirm', candidate: gpsCandidate(result) });
    } catch (err) {
      if (!isCurrent(op) || isAbortError(err)) return;
      setState({ phase: 'gps-failed', message: err instanceof GpsError ? GPS_MESSAGES[err.reason] : reverseFailureMessage(err) });
    }
  }, [client]);

  /** Buyer confirmed the GPS-derived PIN: now check it like a typed one */
  const confirmGps = useCallback(() => {
    if (state.phase !== 'gps-confirm') return;
    return runCheck(state.candidate.pincode, 'gps');
  }, [state, runCheck]);

  /** Buyer rejected the GPS-derived PIN */
  const rejectGps = useCallback(() => {
    begin();
    setState({ phase: 'idle' });
  }, []);

  /**
   * After a lookup outage: keep browsing with this PIN without any delivery claim. It is
   * remembered like any other choice and re-checked later.
   */
  const continueWithoutCheck = useCallback(() => {
    if (state.phase !== 'result' || state.check.status !== 'unavailable') return;
    const { pincode, place } = state.check;
    return save(pincode, place ? describePlace(place) : `PIN ${pincode}`, state.source);
  }, [state, save]);

  const reset = useCallback(() => {
    begin();
    setState({ phase: 'idle' });
  }, []);

  return { state, submitPincode, requestCurrentLocation, confirmGps, rejectGps, continueWithoutCheck, reset };
}
