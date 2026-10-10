// Order lifecycle — the single source of truth for who may move an order where.
//
// The supplier picks a delivery mode when dispatching a CONFIRMED order:
//
// PLATFORM — a BuildX delivery partner delivers
//   CONFIRMED ──supplier──▶ READY_FOR_PICKUP ──driver/ops──▶ ASSIGNED ──driver──▶ PICKED_UP
//                                ▲                              │                  │
//                                └────────ops unassigns─────────┘    driver ▼       │ driver
//                                                                 IN_TRANSIT ──▶ DELIVERED ◀┘
//
// SUPPLIER — the supplier delivers with their own vehicle
//   CONFIRMED ──supplier──▶ IN_TRANSIT ──supplier──▶ DELIVERED
//   READY_FOR_PICKUP ──supplier──▶ IN_TRANSIT   (takeover while no driver is assigned)
//
// Cancellation (→ CANCELLED, restores stock unless ops says the goods are gone):
//   - buyer or supplier: CONFIRMED or READY_FOR_PICKUP only (never once a driver/vehicle has it)
//   - ops: any status before DELIVERED
//
// CANCELLED and DELIVERED are terminal. PENDING and DISPUTED exist in the schema but nothing
// transitions into them yet.
//
// Payment (Order.paymentStatus) is independent of fulfilment. COD stays PENDING through
// delivery; it becomes CAPTURED only when whoever delivered (assigned driver, or the supplier
// in SUPPLIER mode) confirms the exact total, or ops records it (PARTIAL if short).
//
// Every transition is a compare-and-set (`findOneAndUpdate` filtered on the allowed source
// statuses and, after dispatch, the delivery mode), so concurrent or repeated requests can't
// both win. Repeating a transition that already happened returns the order unchanged.

export type OrderStatus =
  | 'PENDING' | 'CONFIRMED' | 'READY_FOR_PICKUP' | 'ASSIGNED' | 'PICKED_UP'
  | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED' | 'DISPUTED';

export type DeliveryMode = 'PLATFORM' | 'SUPPLIER';
export type Actor = 'BUYER' | 'SUPPLIER' | 'DELIVERY_PARTNER' | 'OPS';

type Table = Partial<Record<OrderStatus, Partial<Record<OrderStatus, Actor[]>>>>;

const CANCEL_EARLY: Actor[] = ['SUPPLIER', 'BUYER', 'OPS'];

const TRANSITIONS: Record<DeliveryMode, Table> = {
  PLATFORM: {
    CONFIRMED: { READY_FOR_PICKUP: ['SUPPLIER'], CANCELLED: CANCEL_EARLY },
    READY_FOR_PICKUP: { ASSIGNED: ['DELIVERY_PARTNER', 'OPS'], CANCELLED: CANCEL_EARLY },
    ASSIGNED: { PICKED_UP: ['DELIVERY_PARTNER'], READY_FOR_PICKUP: ['OPS'], CANCELLED: ['OPS'] },
    PICKED_UP: { IN_TRANSIT: ['DELIVERY_PARTNER'], DELIVERED: ['DELIVERY_PARTNER'], CANCELLED: ['OPS'] },
    IN_TRANSIT: { DELIVERED: ['DELIVERY_PARTNER'], CANCELLED: ['OPS'] },
  },
  SUPPLIER: {
    CONFIRMED: { IN_TRANSIT: ['SUPPLIER'], CANCELLED: CANCEL_EARLY },
    READY_FOR_PICKUP: { IN_TRANSIT: ['SUPPLIER'], CANCELLED: CANCEL_EARLY },
    IN_TRANSIT: { DELIVERED: ['SUPPLIER'], CANCELLED: ['OPS'] },
  },
};

// Before dispatch an order has no committed delivery mode; after it, the mode decides who acts.
export const PRE_DISPATCH: OrderStatus[] = ['CONFIRMED', 'READY_FOR_PICKUP'];

/** Statuses from which `actor` may move an order to `to` in the given mode. Empty = never. */
export function allowedSources(to: OrderStatus, actor: Actor, mode: DeliveryMode): OrderStatus[] {
  const table = TRANSITIONS[mode];
  return (Object.keys(table) as OrderStatus[]).filter((from) => table[from]?.[to]?.includes(actor));
}

/** Cancellation sources across both modes (cancel doesn't depend on who was delivering). */
export function cancelSources(actor: Actor): OrderStatus[] {
  return [...new Set([...allowedSources('CANCELLED', actor, 'PLATFORM'), ...allowedSources('CANCELLED', actor, 'SUPPLIER')])];
}

/** Mongo filter matching orders in `mode`. Orders dispatched before modes existed are PLATFORM. */
export function modeFilter(mode: DeliveryMode): Record<string, unknown> {
  return mode === 'SUPPLIER' ? { deliveryMode: 'SUPPLIER' } : { deliveryMode: { $ne: 'SUPPLIER' } };
}

/**
 * Compare-and-set filter for a transition: pre-dispatch sources match on status alone,
 * post-dispatch sources also require the delivery mode.
 */
export function sourceFilter(sources: OrderStatus[], mode: DeliveryMode): Record<string, unknown> {
  const pre = sources.filter((s) => PRE_DISPATCH.includes(s));
  const post = sources.filter((s) => !PRE_DISPATCH.includes(s));
  const clauses: Record<string, unknown>[] = [];
  if (pre.length) clauses.push({ status: { $in: pre } });
  if (post.length) clauses.push({ status: { $in: post }, ...modeFilter(mode) });
  return clauses.length === 1 ? clauses[0] : { $or: clauses };
}
