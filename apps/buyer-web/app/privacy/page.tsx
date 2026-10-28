import type { Metadata } from 'next';
import { LegalPage, Section } from '@/components/layout/LegalPage';

export const metadata: Metadata = {
  title: 'Privacy policy',
  description: 'What personal data BuildX collects, why, who it is shared with, and how to access or delete it.',
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
  return (
    <LegalPage
      path="/privacy"
      title="Privacy policy"
      intro="We collect only what we need to run the marketplace: to sign you in, deliver your order and keep the platform safe. We do not sell your data and we do not use advertising trackers."
    >
      <Section title="What we collect">
        <ul>
          <li><strong>Phone number</strong>, to sign you in with a one-time code and to contact you about orders.</li>
          <li><strong>Name</strong>, which you provide when you create your account.</li>
          <li><strong>Delivery addresses and PIN codes</strong>, to check which suppliers can serve your site and to deliver orders.</li>
          <li><strong>Order details</strong>: products, quantities, prices, status history and payment method (cash on delivery).</li>
          <li><strong>Reviews</strong> you choose to write about suppliers.</li>
          <li><strong>Technical data</strong> such as IP address and browser type, used for security, abuse prevention and fixing errors.</li>
        </ul>
        <p>
          We do not collect card or bank details. We do not store your precise GPS position: if you use &ldquo;current
          location&rdquo;, it is used once to suggest a PIN code and then discarded.
        </p>
      </Section>

      <Section title="Why we use it">
        <ul>
          <li>To create and secure your account.</li>
          <li>To show products available at your location and to process, deliver and support your orders.</li>
          <li>To share the details a supplier or delivery partner needs to fulfil your order.</li>
          <li>To meet legal, tax and accounting obligations, and to prevent fraud.</li>
        </ul>
      </Section>

      <Section title="Who we share it with">
        <p>Only with the parties needed to provide the service:</p>
        <ul>
          <li>
            <strong>The supplier</strong> fulfilling your order and any <strong>delivery partner</strong> assigned to it: your name,
            phone number and delivery address.
          </li>
          <li>
            <strong>Google Firebase</strong> for phone sign-in, and <strong>Google reCAPTCHA</strong> to block automated abuse of sign-in.
          </li>
          <li>
            <strong>Hosting and infrastructure providers</strong> that store and serve our app, database and product images (for
            example Vercel, Render, MongoDB Atlas and Cloudinary).
          </li>
          <li>Authorities, where the law requires it.</li>
        </ul>
        <p>Some of these providers may process data outside India, under their own security and privacy commitments.</p>
      </Section>

      <Section title="How long we keep it">
        <p>
          We keep your account data while your account is active. Order records are kept for as long as tax and accounting laws
          require. When data is no longer needed, we delete or anonymise it.
        </p>
      </Section>

      <Section title="Your rights">
        <p>Under India&apos;s Digital Personal Data Protection Act, 2023, you can ask us to:</p>
        <ul>
          <li>Tell you what personal data we hold about you.</li>
          <li>Correct or update inaccurate data.</li>
          <li>Delete your account and personal data, except records we must keep by law.</li>
          <li>Withdraw consent, which may mean we can no longer provide the service.</li>
        </ul>
        <p>To make a request, contact us using the details below. We will respond within a reasonable time.</p>
      </Section>

      <Section title="Children">
        <p>
          BuildX is for people aged 18 and over. We do not knowingly collect data from children. If you believe a child has
          created an account, contact us and we will delete it.
        </p>
      </Section>

      <Section title="Security">
        <p>
          Data is sent over encrypted HTTPS connections. Sign-in uses one-time codes, so there are no passwords to steal. Access
          to personal data inside BuildX is limited to staff who need it for their work.
        </p>
      </Section>

      <Section title="Changes">
        <p>If we change this policy in a meaningful way, we will update the date above and, where appropriate, tell you in the app.</p>
      </Section>
    </LegalPage>
  );
}
