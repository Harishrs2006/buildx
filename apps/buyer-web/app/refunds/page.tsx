import type { Metadata } from 'next';
import { LegalPage, Section } from '@/components/layout/LegalPage';

export const metadata: Metadata = {
  title: 'Cancellations and refunds',
  description: 'How to cancel a BuildX order, and what happens if materials arrive damaged or wrong.',
  alternates: { canonical: '/refunds' },
};

export default function RefundsPage() {
  return (
    <LegalPage
      path="/refunds"
      title="Cancellations and refunds"
      intro="Because you pay cash on delivery, there is usually nothing to refund. Here is how cancellations and delivery problems are handled."
    >
      <Section title="Cancelling an order">
        <ul>
          <li>
            You can cancel from the order page while the order is in a state that allows it, typically before the supplier
            dispatches it. The cancel option disappears once cancellation is no longer possible.
          </li>
          <li>Cancelling a cash on delivery order costs nothing, since you have not paid.</li>
          <li>A supplier may cancel an order if materials become unavailable. The updated status appears on your order.</li>
        </ul>
      </Section>

      <Section title="At delivery">
        <ul>
          <li>Check quantity, brand, grade and condition before you pay.</li>
          <li>
            If something is damaged, short or different from what you ordered, you may refuse that item, or the whole delivery, and
            pay only for what you accept.
          </li>
        </ul>
      </Section>

      <Section title="Problems found after payment">
        <p>
          Report the issue as soon as possible with your order number and photos. We will work with the supplier to resolve it with
          a replacement, collection or refund of the amount paid for the affected item, as appropriate. Approved refunds are paid
          back by an agreed method within a reasonable time.
        </p>
      </Section>

      <Section title="Items that cannot be returned">
        <p>
          Materials that have been used, mixed, cut to size or left exposed to weather after delivery, and loose materials such as
          sand or aggregates once unloaded, generally cannot be returned unless they were defective or not as ordered.
        </p>
      </Section>
    </LegalPage>
  );
}
