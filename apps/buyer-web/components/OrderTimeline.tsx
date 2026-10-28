import type { BuyerOrder } from '../lib/orders';

const STEP_LABELS: Record<string, string> = {
  PENDING: 'Order placed',
  CONFIRMED: 'Confirmed by supplier',
  READY_FOR_PICKUP: 'Ready for pickup',
  ASSIGNED: 'Driver assigned',
  PICKED_UP: 'Picked up',
  IN_TRANSIT: 'Out for delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  DISPUTED: 'Disputed',
};

const dateFormat = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

export function OrderTimeline({ order }: { order: BuyerOrder }) {
  // Every order always has at least a PENDING entry (written at creation); a missing history
  // (very old orders, or any gap) falls back to just the current status so this never looks empty.
  const history = order.statusHistory ?? [];
  const steps = history.length > 0 ? history : [{ status: order.status, at: order.createdAt, byRole: 'SYSTEM' as const }];
  const isTerminalBad = order.status === 'CANCELLED' || order.status === 'DISPUTED';
  const inProgress = !isTerminalBad && order.status !== 'DELIVERED';

  return (
    <div className="flex flex-col gap-5">
      <h2 className="font-display text-xl font-semibold tracking-tight">Tracking</h2>
      <ol className="flex flex-col">
        {steps.map((step, i) => {
          const isLast = i === steps.length - 1;
          const bad = step.status === 'CANCELLED' || step.status === 'DISPUTED';
          const current = isLast && inProgress;
          return (
            <li key={i} className="flex gap-4">
              <div className="flex flex-col items-center">
                <span
                  className={`relative flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
                    bad ? 'bg-error text-white' : current ? 'bg-lime text-ink' : 'bg-ink text-lime'
                  }`}
                >
                  {current && <span className="absolute inset-0 animate-pulse-ring rounded-full bg-lime" aria-hidden="true" />}
                  <span className="material-symbols-outlined relative text-[18px]" aria-hidden="true">
                    {bad ? 'close' : current ? 'radio_button_checked' : 'check'}
                  </span>
                </span>
                {!isLast && <span className="my-1 w-0.5 flex-1 rounded bg-ink/80" />}
              </div>
              <div className={isLast ? 'pb-1 pt-1' : 'pb-7 pt-1'}>
                <p className="text-[15px] font-semibold">
                  {STEP_LABELS[step.status] ?? step.status}
                  {current && <span className="sr-only"> (current step)</span>}
                </p>
                <p className="mt-0.5 font-mono text-[12px] text-stone">{dateFormat.format(new Date(step.at))}</p>
                {step.note && <p className="mt-1 text-[14px] text-stone">{step.note}</p>}
              </div>
            </li>
          );
        })}
      </ol>
      {inProgress && (
        <p className="flex items-start gap-2 rounded-xl bg-sand-3 px-4 py-3 text-[14px] text-stone">
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">local_shipping</span>
          {order.deliveryMode === 'SUPPLIER' ? 'This supplier is delivering it themselves.' : 'A BuildX delivery partner will pick this up.'}
        </p>
      )}
    </div>
  );
}
