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

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-headline font-bold">Track order</h2>
      <ol className="flex flex-col gap-0">
        {steps.map((step, i) => {
          const isLast = i === steps.length - 1;
          const bad = step.status === 'CANCELLED' || step.status === 'DISPUTED';
          return (
            <li key={i} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span
                  className={
                    bad
                      ? 'flex h-6 w-6 items-center justify-center rounded-full bg-error text-on-error'
                      : 'flex h-6 w-6 items-center justify-center rounded-full bg-primary text-on-primary'
                  }
                >
                  <span className="material-symbols-outlined text-sm">{bad ? 'close' : 'check'}</span>
                </span>
                {!isLast && <span className="w-px flex-1 bg-outline-variant" />}
              </div>
              <div className={isLast ? 'pb-1' : 'pb-6'}>
                <p className="font-body text-sm font-semibold text-on-surface">{STEP_LABELS[step.status] ?? step.status}</p>
                <p className="font-body text-xs text-on-surface-variant">{dateFormat.format(new Date(step.at))}</p>
                {step.note && <p className="font-body text-xs text-on-surface-variant">{step.note}</p>}
              </div>
            </li>
          );
        })}
      </ol>
      {!isTerminalBad && order.status !== 'DELIVERED' && (
        <p className="font-body text-xs text-on-surface-variant">
          {order.deliveryMode === 'SUPPLIER' ? 'This supplier is delivering it themselves.' : 'A BuildX delivery partner will pick this up.'}
        </p>
      )}
    </div>
  );
}
