'use client';

import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useDeliveryServiceability, useLocationSelector, useSelectedLocation, type UseLocationSelectorOptions } from './hooks';
import type { PlaceInfo } from './lookup';
import type { SelectedLocation } from './store';

// Reusable delivery-location picker for the BuildX web apps.
// Styling uses the apps' Tailwind theme tokens (primary, muted, destructive, border); add
// this package to the consuming app's Tailwind `content` globs.
//
// Wording rule: a valid PIN is never described as deliverable. Only the serviceability
// endpoint's answer for that exact PIN can say "we deliver here".

export type LocationSelectorProps = {
  onLocationChange?: (location: SelectedLocation) => void;
  /** Hide the GPS button (e.g. where location use isn't appropriate) */
  allowGps?: boolean;
  title?: string;
  className?: string;
  getPosition?: UseLocationSelectorOptions['getPosition'];
};

const btn = 'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';
const btnPrimary = `${btn} bg-primary text-primary-foreground hover:bg-primary/90`;
const btnSecondary = `${btn} border border-border bg-background hover:bg-muted`;
const btnLink = 'text-sm font-medium text-primary underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded';

function PlaceDetails({ place }: { place: PlaceInfo }) {
  const offices = place.postOffices.slice(0, 3);
  const more = place.postOffices.length - offices.length;
  return (
    <p className="text-sm text-muted-foreground">
      {offices.length > 0 && <>{offices.join(', ')}{more > 0 ? ` +${more} more` : ''} · </>}
      {[place.district, place.state].filter(Boolean).join(', ')}
    </p>
  );
}

export function LocationSelector({ onLocationChange, allowGps = true, title = 'Delivery location', className = '', getPosition }: LocationSelectorProps) {
  const selected = useSelectedLocation();
  const delivery = useDeliveryServiceability();
  const { state, submitPincode, requestCurrentLocation, confirmGps, rejectGps, continueWithoutCheck, reset } =
    useLocationSelector({ onSelected: (loc) => { setEditing(false); onLocationChange?.(loc); }, getPosition });

  const [editing, setEditing] = useState(!selected);
  const [input, setInput] = useState('');
  const ids = { title: useId(), input: useId(), error: useId(), hint: useId(), gps: useId() };
  const inputRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const changeRef = useRef<HTMLButtonElement>(null);
  const wasEditing = useRef(editing);

  // If a remembered location appears after hydration, show it instead of the empty form
  useEffect(() => { if (selected && state.phase === 'idle') setEditing(false); }, [selected?.pincode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Focus management: into the field when editing starts, back to "Change" when it ends
  useEffect(() => {
    if (editing && !wasEditing.current) inputRef.current?.focus();
    if (!editing && wasEditing.current) changeRef.current?.focus();
    wasEditing.current = editing;
  }, [editing]);
  useEffect(() => { if (state.phase === 'gps-confirm') confirmRef.current?.focus(); }, [state.phase]);

  const busy = state.phase === 'checking' || state.phase === 'locating';
  const check = state.phase === 'result' ? state.check : null;
  const inputError = check?.status === 'invalid' ? check.message : null;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    submitPincode(input);
  }

  function startEditing() {
    reset();
    setInput('');
    setEditing(true);
  }

  function cancelEditing() {
    reset();
    setEditing(false);
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape' && selected) {
      e.preventDefault();
      cancelEditing();
    }
  }

  return (
    <section aria-labelledby={ids.title} className={`w-full max-w-xl rounded-lg border border-border bg-background p-4 sm:p-5 ${className}`}>
      <h2 id={ids.title} className="text-base font-semibold">{title}</h2>

      {!editing && selected ? (
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm">
              Deliver to <strong className="font-semibold">{selected.pincode}</strong>
              <span className="text-muted-foreground"> · {selected.label}</span>
            </p>
            <p role="status" aria-live="polite" className="mt-1 text-sm">
              {delivery.status === 'checking' && <span className="text-muted-foreground">Checking delivery…</span>}
              {delivery.status === 'serviceable' && (
                <span>BuildX delivers here · {delivery.supplierCount} supplier{delivery.supplierCount === 1 ? '' : 's'}</span>
              )}
              {delivery.status === 'not-serviceable' && <span>BuildX doesn't deliver to {delivery.pincode} yet.</span>}
              {delivery.status === 'unavailable' && (
                <span>
                  {delivery.message}.{' '}
                  <button type="button" className={btnLink} onClick={delivery.recheck}>Retry</button>
                </span>
              )}
            </p>
          </div>
          <button
            ref={changeRef}
            type="button"
            className={btnSecondary}
            onClick={startEditing}
            aria-label={`Change delivery location (currently ${selected.pincode})`}
          >
            Change
          </button>
        </div>
      ) : (
        <div className="mt-3" onKeyDown={onKeyDown}>
          {state.phase === 'gps-confirm' ? (
            <div role="group" aria-labelledby={ids.gps} className="flex flex-col gap-3">
              <p id={ids.gps} className="text-sm">
                Your location looks like PIN <strong className="font-semibold">{state.candidate.pincode}</strong>
                {state.candidate.detectedLabel ? <> ({state.candidate.detectedLabel})</> : null}. Is this where you want delivery?
              </p>
              {state.candidate.place && <PlaceDetails place={state.candidate.place} />}
              <div className="flex flex-col gap-2 sm:flex-row">
                <button ref={confirmRef} type="button" className={btnPrimary} onClick={() => confirmGps()}>
                  Yes, use {state.candidate.pincode}
                </button>
                <button type="button" className={btnSecondary} onClick={() => { rejectGps(); setInput(''); inputRef.current?.focus(); }}>
                  No, I'll enter my PIN
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label htmlFor={ids.input} className="text-sm font-medium">PIN code</label>
                <p id={ids.hint} className="text-xs text-muted-foreground">6-digit Indian PIN code of the delivery site</p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    ref={inputRef}
                    id={ids.input}
                    name="pincode"
                    type="text"
                    inputMode="numeric"
                    autoComplete="postal-code"
                    maxLength={7}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    aria-invalid={inputError ? true : undefined}
                    aria-describedby={`${ids.hint}${inputError ? ` ${ids.error}` : ''}`}
                    disabled={busy}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-base sm:w-40 aria-[invalid=true]:border-destructive focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <button type="submit" className={btnPrimary} disabled={busy}>
                    {state.phase === 'checking' ? 'Checking…' : 'Check PIN'}
                  </button>
                </div>
                {inputError && <p id={ids.error} role="alert" className="text-sm text-destructive">{inputError}</p>}
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                {allowGps && (
                  <button type="button" className={btnSecondary} onClick={() => requestCurrentLocation()} disabled={busy}>
                    {state.phase === 'locating' ? 'Finding your location…' : 'Use my current location'}
                  </button>
                )}
                {selected && <button type="button" className={btnLink} onClick={cancelEditing}>Cancel</button>}
              </div>
            </form>
          )}

          <div role="status" aria-live="polite" className="mt-3 text-sm empty:hidden">
            {state.phase === 'checking' && <p className="text-muted-foreground">Checking {state.pincode}…</p>}
            {state.phase === 'gps-failed' && <p>{state.message}</p>}
            {check?.status === 'not-found' && <p>{check.message}</p>}
            {check?.status === 'not-serviceable' && (
              <div>
                <PlaceDetails place={check.place} />
                <p className="mt-1">{check.message}</p>
              </div>
            )}
            {check?.status === 'unavailable' && (
              <div className="flex flex-col gap-2">
                {check.place && <PlaceDetails place={check.place} />}
                <p>{check.message}</p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button type="button" className={btnSecondary} onClick={() => submitPincode(check.pincode)}>Retry</button>
                  <button type="button" className={btnLink} onClick={() => continueWithoutCheck()}>
                    Continue browsing without a delivery check
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
