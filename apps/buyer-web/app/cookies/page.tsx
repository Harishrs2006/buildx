import type { Metadata } from 'next';
import { LegalPage, Section } from '@/components/layout/LegalPage';
import { CookieSettingsButton } from '@/components/layout/CookieSettingsButton';

export const metadata: Metadata = {
  title: 'Cookie policy',
  description: 'What Sthiva stores in your browser, and your choice about analytics. No advertising cookies.',
  alternates: { canonical: '/cookies' },
};

export default function CookiesPage() {
  return (
    <LegalPage
      path="/cookies"
      title="Cookie policy"
      intro="Sthiva does not use advertising cookies. We store what the site needs to work, and use analytics only if you allow it."
    >
      <Section title="What we store in your browser">
        <ul>
          <li>
            <strong>Sign-in session</strong> (Firebase Authentication), so you stay signed in.
          </li>
          <li>
            <strong>Cart</strong> (<code>sthiva.cart</code>), so your cart survives a page refresh.
          </li>
          <li>
            <strong>Delivery PIN</strong> (<code>sthiva.deliveryLocation</code>): your PIN code and area name, forgotten after 90
            days. No coordinates are stored.
          </li>
          <li>
            <strong>Notice preference</strong> (<code>sthiva.storageNotice</code>, <code>sthiva.analyticsConsent</code>), remembering
            your answer to our cookie notice.
          </li>
        </ul>
      </Section>
      <Section title="Third parties">
        <p>
          Google reCAPTCHA runs during sign-in to block automated abuse and may set its own cookies, under Google&apos;s privacy
          policy.
        </p>
        <p>
          Google Analytics runs only if you choose &quot;Allow analytics&quot;. It sets <code>_ga</code> cookies to count visits and
          see which pages help. Advertising features are switched off.
        </p>
      </Section>
      <Section title="Your choices">
        <CookieSettingsButton />
        <p>
          You can clear this data at any time from your browser settings. If you do, you will be signed out and your cart and PIN
          will be forgotten.
        </p>
      </Section>
    </LegalPage>
  );
}
