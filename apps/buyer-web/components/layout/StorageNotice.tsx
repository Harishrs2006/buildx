'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const KEY = 'buildx.storageNotice';

// BuildX stores only essential data (session, cart, PIN), so this is a notice, not a consent
// gate: there is nothing optional to accept or reject. Shown once, then remembered.
export function StorageNotice() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setShow(true);
    } catch {
      // Storage blocked: nothing will be stored, so there is nothing to tell the user
    }
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(KEY, '1');
    } catch {}
    setShow(false);
  }

  if (!show) return null;

  return (
    <div
      role="region"
      aria-label="Storage notice"
      className="fixed inset-x-3 bottom-[92px] z-[60] mx-auto flex max-w-xl animate-fade-up items-center gap-4 rounded-2xl border border-white/10 bg-ink px-5 py-4 text-[14px] text-sand/80 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)] md:bottom-6"
    >
      <span className="material-symbols-outlined hidden text-lime sm:block" aria-hidden="true">cookie</span>
      <p className="flex-1 leading-snug">
        We only store what the site needs to work: your sign-in, cart and delivery PIN. No ad trackers.{' '}
        <Link href="/cookies" className="font-medium text-sand underline underline-offset-2">Details</Link>
      </p>
      <button type="button" onClick={dismiss} className="shrink-0 rounded-full bg-lime px-4 py-2 font-semibold text-ink transition-colors hover:bg-lime-deep">
        Got it
      </button>
    </div>
  );
}
