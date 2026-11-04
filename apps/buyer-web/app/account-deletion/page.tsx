import type { Metadata } from 'next';
import { LegalPage, Section } from '@/components/layout/LegalPage';

export const metadata: Metadata = {
  title: 'Delete your account',
  description: 'How to delete your Sthiva account and what happens to your data.',
  alternates: { canonical: '/account-deletion' },
};

// Public page the Play Store and App Store listings link to for account deletion
export default function AccountDeletionPage() {
  return (
    <LegalPage
      path="/account-deletion"
      title="Delete your account"
      intro="You can delete your Sthiva account at any time. Here is how, and what happens to your data."
    >
      <Section title="How to delete it">
        <ul>
          <li>On the website: sign in, open Account, then choose Delete my account and confirm.</li>
          <li>If you cannot sign in, contact Sthiva support from the number you registered with and ask us to delete it.</li>
        </ul>
      </Section>

      <Section title="Before you delete">
        <p>
          Orders that are still open must be delivered or cancelled first. The option tells you if any are still open.
        </p>
      </Section>

      <Section title="What is deleted">
        <ul>
          <li>Your name, phone number or email, and saved delivery addresses.</li>
          <li>Your sign-in, so the account can no longer be used.</li>
          <li>For suppliers: your listings are taken off sale and your business profile is closed.</li>
        </ul>
      </Section>

      <Section title="What we keep">
        <p>
          Past orders and invoices are kept without your contact details, because tax law requires these records. They are not
          used for marketing. You can sign up again later with the same phone number or Google account as a new user.
        </p>
      </Section>
    </LegalPage>
  );
}
