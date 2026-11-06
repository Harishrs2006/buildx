'use client';

import { GA_ID, resetConsent } from '@/lib/analytics';

// Asks the cookie question again (only meaningful when analytics is configured)
export function CookieSettingsButton() {
  if (!GA_ID) return null;
  return (
    <p>
      <button type="button" onClick={resetConsent} className="font-medium text-cobalt underline underline-offset-2">
        Change my analytics choice
      </button>
    </p>
  );
}
