// Google Analytics 4, strictly opt-in: nothing loads until the visitor chooses "Allow analytics" in the
// storage notice. Without NEXT_PUBLIC_GA_ID set, analytics is off and the notice stays a plain notice.
export const GA_ID = process.env.NEXT_PUBLIC_GA_ID || '';
export const CONSENT_KEY = 'sthiva.analyticsConsent'; // 'granted' | 'denied'
export const CONSENT_EVENT = 'sthiva:analytics-consent';

export function readConsent(): 'granted' | 'denied' | null {
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    return v === 'granted' || v === 'denied' ? v : null;
  } catch {
    return null;
  }
}

export function saveConsent(value: 'granted' | 'denied') {
  try { localStorage.setItem(CONSENT_KEY, value); } catch {}
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: value }));
}

/** Forget the choice so the notice asks again (footer "Cookie settings"). */
export function resetConsent() {
  try { localStorage.removeItem(CONSENT_KEY); localStorage.removeItem('sthiva.storageNotice'); } catch {}
  window.location.reload();
}
