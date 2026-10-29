import Link from 'next/link';
import { ORDER_STATUS, Pill, rupees } from './ui';
import { ago, populated, type OrderSummary } from '../lib/ops';

// One order in a list: number, status, who is involved, how long since it last moved
export function OrderLine({ order }: { order: OrderSummary }) {
  const supplier = populated(order.supplierId);
  const buyer = populated(order.buyerId);
  const status = ORDER_STATUS[order.status];
  return (
    <li>
      <Link href={`/orders/${order._id}`} className="flex items-center gap-4 py-3 transition-colors hover:bg-sand-3/50">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[14px] font-medium">{order.orderNumber}</span>
            <Pill tone={status.tone}>{status.label}</Pill>
            {order.deliveryMode === 'SUPPLIER' && <span className="text-[12px] text-stone">Supplier vehicle</span>}
          </div>
          <p className="mt-1 truncate text-[14px] text-stone">
            {supplier?.businessName ?? 'Supplier'}
            {buyer?.name ? ` to ${buyer.name}` : ''} · moved {ago(order.updatedAt)}
          </p>
        </div>
        <span className="font-display text-[16px] font-bold tabular-nums">{rupees.format(order.total)}</span>
      </Link>
    </li>
  );
}
