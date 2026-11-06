import { deliveryTimePhrase, formatDeliveryDate } from '@sthiva/web-core';
import type { BuyerOrder } from '@/lib/orders';

// When will it arrive? The supplier's confirmed date once they accept; until then their usual time.
export function DeliveryDateCard({ order }: { order: BuyerOrder }) {
  if (order.status === 'DELIVERED' || order.status === 'CANCELLED') return null;
  const expected = order.expectedDelivery;
  if (!order.deliveryDate && !expected) return null;

  if (order.deliveryDate) {
    return (
      <section className="card flex items-center gap-4 p-5 sm:p-6" aria-label="Delivery date">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-lime text-ink">
          <span className="material-symbols-outlined text-[24px]" aria-hidden="true">event_available</span>
        </span>
        <div>
          <p className="eyebrow text-stone">Delivery date</p>
          <p className="mt-1 font-display text-2xl font-bold tracking-tight">{formatDeliveryDate(order.deliveryDate)}</p>
          <p className="mt-0.5 text-[14px] text-stone">Confirmed by the supplier. You will be told if it changes.</p>
        </div>
      </section>
    );
  }

  const when = deliveryTimePhrase(expected!.minDays, expected!.maxDays);
  return (
    <section className="card flex items-center gap-4 p-5 sm:p-6" aria-label="Expected delivery">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-sand-3 text-ink">
        <span className="material-symbols-outlined text-[24px]" aria-hidden="true">event</span>
      </span>
      <div>
        <p className="eyebrow text-stone">Expected delivery</p>
        <p className="mt-1 font-display text-xl font-bold tracking-tight">Usually {when}</p>
        <p className="mt-0.5 text-[14px] text-stone">
          {order.status === 'PENDING'
            ? 'Counted from when the supplier accepts. They confirm the exact date then.'
            : 'The supplier will confirm the exact date.'}
        </p>
      </div>
    </section>
  );
}
