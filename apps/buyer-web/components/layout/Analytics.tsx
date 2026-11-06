'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import { CONSENT_EVENT, GA_ID, readConsent } from '@/lib/analytics';

// Loads Google Analytics only after the visitor allowed it (see StorageNotice). IP addresses are not
// stored by GA4; ads personalisation and Google signals stay off.
export function Analytics() {
  const [granted, setGranted] = useState(false);

  useEffect(() => {
    if (!GA_ID) return;
    setGranted(readConsent() === 'granted');
    const on = (e: Event) => setGranted((e as CustomEvent).detail === 'granted');
    window.addEventListener(CONSENT_EVENT, on);
    return () => window.removeEventListener(CONSENT_EVENT, on);
  }, []);

  if (!GA_ID || !granted) return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
      <Script id="ga4" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());` +
          `gtag('config','${GA_ID}',{allow_google_signals:false,allow_ad_personalization_signals:false});`}
      </Script>
    </>
  );
}
