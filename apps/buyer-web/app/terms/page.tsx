import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage, Section } from '@/components/layout/LegalPage';

export const metadata: Metadata = {
  title: 'Terms of service',
  description: 'The rules for buying construction materials on the BuildX marketplace.',
  alternates: { canonical: '/terms' },
};

export default function TermsPage() {
  return (
    <LegalPage
      path="/terms"
      title="Terms of service"
      intro="These terms explain how BuildX works and what you and we can expect from each other. By creating an account or placing an order you agree to them."
    >
      <Section title="What BuildX is">
        <p>
          BuildX is an online marketplace that connects buyers with independent suppliers of construction materials. Products are
          sold by the suppliers listed on each product page. BuildX provides the platform, checks supplier verification and
          processes orders.
        </p>
      </Section>

      <Section title="Your account">
        <ul>
          <li>You must be 18 or older and use a mobile number you control.</li>
          <li>
            You are responsible for activity on your account. Do not share one-time codes with anyone. BuildX staff will never ask
            for them.
          </li>
          <li>We may suspend accounts used for fraud, abuse or in breach of these terms.</li>
        </ul>
      </Section>

      <Section title="Prices, stock and delivery">
        <ul>
          <li>
            Prices are set by suppliers and shown in Indian Rupees. The final amount, including GST and any delivery charge, is
            shown at checkout before you confirm.
          </li>
          <li>
            Our servers recheck price, stock and delivery availability when you place the order. If anything has changed, the order
            will not go through until you review it.
          </li>
          <li>A valid PIN code does not guarantee delivery. Delivery is only available where a supplier has configured that area.</li>
          <li>Delivery times shown are estimates provided by suppliers, not guarantees.</li>
        </ul>
      </Section>

      <Section title="Payment">
        <p>
          Orders are paid by <strong>cash on delivery</strong>. Please check the materials on arrival and pay the amount shown on
          your order. There are no hidden fees.
        </p>
      </Section>

      <Section title="Cancellations and returns">
        <p>
          See our{' '}
          <Link href="/refunds" className="font-medium text-cobalt hover:underline">
            Cancellations and refunds policy
          </Link>
          .
        </p>
      </Section>

      <Section title="Your responsibilities">
        <ul>
          <li>
            Give an accurate delivery address, make sure someone can receive the order, and make sure the site is accessible for
            delivery vehicles.
          </li>
          <li>Use materials safely and according to manufacturer guidance and applicable building rules.</li>
          <li>Write honest reviews based on your own experience.</li>
        </ul>
      </Section>

      <Section title="Liability">
        <p>
          Suppliers are responsible for the quality and specification of the products they sell. To the extent permitted by law,
          BuildX is not liable for indirect or consequential losses, such as project delays. Nothing in these terms limits rights
          you have under the Consumer Protection Act, 2019.
        </p>
      </Section>

      <Section title="Governing law">
        <p>
          These terms are governed by the laws of India. Courts in Karnataka have jurisdiction over any dispute, without affecting
          your right to approach a consumer commission.
        </p>
      </Section>
    </LegalPage>
  );
}
