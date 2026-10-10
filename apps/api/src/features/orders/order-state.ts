// Order lifecycle — the single source of truth for who may move an order where.
//
// Fulfilment status (Order.status):
//
//   CONFIRMED ──supplier──▶ READY_FOR_PICKUP ──driver assigns──▶ ASSIGNED
//       │                        │                                  │ driver
//       │ supplier rejects /     │ supplier rejects /               ▼
//       │ buyer cancels          │ buyer cancels                PICKED_UP ──driver──▶ IN_TRANSIT
//       ▼                        ▼                                  │                      │
//   CANCELLED ◀──────────────────┘                                  └──driver──▶ DELIVERED ◀┘
//
//   - Orders are created directly as CONFIRMED (COD) with stock already deducted.
//   - Once a driver is assigned, neither buyer nor supplier can cancel; that needs ops.
//   - Only the assigned driver moves ASSIGNED → PICKED_UP → (IN_TRANSIT) → DELIVERED.
//   - CANCELLED and DELIVERED are terminal. PENDING and DISPUTED exist in the schema
//     but nothing transitions into them yet.
//
// Payment status (Order.paymentStatus) is independent of fulfilment:
//   - COD orders stay PENDING through delivery.
//   - Only the assigned driver's explicit cash confirmation (POST /delivery/orders/:id/cod)
//     moves PENDING → CAPTURED, and only after DELIVERED with the exact order total.
//
// Every transition is applied as a compare-and-set (`findOneAndUpdate` filtered on
// the allowed source statuses), so concurrent or repeated requests can't both win.
// Repeating a transition that already happened returns the current order unchanged.

import type { UserRole } from '@buildx/shared';

export type OrderStatus =
  | 'PENDING' | 'CONFIRMED' | 'READY_FOR_PICKUP' | 'ASSIGNED' | 'PICKED_UP'
  | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED' | 'DISPUTED';

type Actor = Extract<UserRole, 'BUYER' | 'SUPPLIER' | 'DELIVERY_PARTNER'>;

// from → to → roles allowed to make that move
const TRANSITIONS: Partial<Record<OrderStatus, Partial<Record<OrderStatus, Actor[]>>>> = {
  CONFIRMED: { READY_FOR_PICKUP: ['SUPPLIER'], CANCELLED: ['SUPPLIER', 'BUYER'] },
  READY_FOR_PICKUP: { ASSIGNED: ['DELIVERY_PARTNER'], CANCELLED: ['SUPPLIER', 'BUYER'] },
  ASSIGNED: { PICKED_UP: ['DELIVERY_PARTNER'] },
  PICKED_UP: { IN_TRANSIT: ['DELIVERY_PARTNER'], DELIVERED: ['DELIVERY_PARTNER'] },
  IN_TRANSIT: { DELIVERED: ['DELIVERY_PARTNER'] },
};

/** Statuses from which `actor` may move an order to `to`. Empty = never allowed. */
export function allowedSources(to: OrderStatus, actor: Actor): OrderStatus[] {
  return (Object.keys(TRANSITIONS) as OrderStatus[]).filter((from) => TRANSITIONS[from]?.[to]?.includes(actor));
}

/** Target statuses an actor can ever request. */
export function targetsFor(actor: Actor): OrderStatus[] {
  const targets = new Set<OrderStatus>();
  for (const from of Object.keys(TRANSITIONS) as OrderStatus[]) {
    for (const [to, actors] of Object.entries(TRANSITIONS[from]!)) {
      if (actors?.includes(actor)) targets.add(to as OrderStatus);
    }
  }
  return [...targets];
}

export function canTransition(from: OrderStatus, to: OrderStatus, actor: Actor): boolean {
  return !!TRANSITIONS[from]?.[to]?.includes(actor);
}
