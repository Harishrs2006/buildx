import type { Metadata } from 'next';
import { LegalPage, Section } from '@/components/layout/LegalPage';

export const metadata: Metadata = {
  title: 'Cookie policy',
  description: 'BuildX uses only essential browser storage. No advertising or analytics cookies.',
  alternates: { canonical: '/cookies' },
};

export default function CookiesPage() {
  return (
    <LegalPage
      path="/cookies"
      title="Cookie policy"
      intro="BuildX does not use advertising or analytics cookies. We only store what the site needs to work."
    >
      <Section title="What we store in your browser">
        <ul>
          <li>
            <strong>Sign-in session</strong> (Firebase Authentication), so you stay signed in.
          </li>
          <li>
            <strong>Cart</strong> (<code>buildx.cart</code>), so your cart survives a page refresh.
          </li>
          <li>
            <strong>Delivery PIN</strong> (<code>buildx.deliveryLocation</code>): your PIN code and area name, forgotten after 90
            days. No coordinates are stored.
          </li>
          <li>
            <strong>Notice preference</strong> (<code>buildx.storageNotice</code>), remembering that you dismissed our storage
            notice.
          </li>
        </ul>
      </Section>
      <Section title="Third parties">
        <p>
          Google reCAPTCHA runs during sign-in to block automated abuse and may set its own cookies, under Google&apos;s privacy
          policy.
        </p>
      </Section>
      <Section title="Your choices">
        <p>
          You can clear this data at any time from your browser settings. If you do, you will be signed out and your cart and PIN
          will be forgotten.
        </p>
      </Section>
    </LegalPage>
  );
}
