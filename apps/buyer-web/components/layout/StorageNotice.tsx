'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { GA_ID, readConsent, saveConsent } from '@/lib/analytics';

const KEY = 'sthiva.storageNotice';

// Essential storage (session, cart, PIN) needs no consent, so without analytics this is a notice.
// When Google Analytics is configured it becomes a real choice: analytics loads only after "Allow".
// Either way it is shown once, then remembered; "Cookie settings" on /cookies asks again.
export function StorageNotice() {
  const [show, setShow] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    try {
      const needed = GA_ID ? readConsent() === null : !localStorage.getItem(KEY);
      if (needed) setShow(true);
    } catch {
      // Storage blocked: nothing will be stored, so there is nothing to tell the user
    }
  }, []);

  function close(choice?: 'granted' | 'denied') {
    try { localStorage.setItem(KEY, '1'); } catch {}
    if (choice) saveConsent(choice);
    setShow(false);
  }

  // Sign-in screens already show the reCAPTCHA notice; keep them uncluttered
  if (!show || pathname === '/signin' || pathname === '/onboard') return null;

  return (
    <div
      role="region"
      aria-label="Cookie notice"
      className="fixed inset-x-3 bottom-[92px] z-[60] mx-auto flex max-w-xl animate-fade-up flex-col gap-3 rounded-2xl border border-white/10 bg-ink px-5 py-4 text-[14px] text-sand/80 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)] sm:flex-row sm:items-center sm:gap-4 md:bottom-6"
    >
      <span className="material-symbols-outlined hidden text-lime sm:block" aria-hidden="true">cookie</span>
      <p className="flex-1 leading-snug">
        {GA_ID
          ? 'We store your sign-in, cart and delivery PIN so the site works. With your OK we also use Google Analytics to see which pages help. No ad trackers.'
          : 'We only store what the site needs to work: your sign-in, cart and delivery PIN. No ad trackers.'}{' '}
        <Link href="/cookies" className="font-medium text-sand underline underline-offset-2">Details</Link>
      </p>
      {GA_ID ? (
        <div className="flex shrink-0 gap-2">
          <button type="button" onClick={() => close('denied')} className="rounded-full border border-white/20 px-4 py-2 font-semibold text-sand transition-colors hover:bg-white/10">
            Essential only
          </button>
          <button type="button" onClick={() => close('granted')} className="rounded-full bg-lime px-4 py-2 font-semibold text-ink transition-colors hover:bg-lime-deep">
            Allow analytics
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => close()} className="shrink-0 self-start rounded-full bg-lime px-4 py-2 font-semibold text-ink transition-colors hover:bg-lime-deep sm:self-auto">
          Got it
        </button>
      )}
    </div>
  );
}
