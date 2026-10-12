import { createHash, randomBytes } from 'crypto';
import mongoose, { ClientSession, Types } from 'mongoose';
import { Product, IProduct } from '../../infrastructure/database/models/Product.model';
import { Order, IOrder, OrderStatusEvent } from '../../infrastructure/database/models/Order.model';
import { AppError } from '../../shared/errors/AppError';
import { PricingError, priceOrder, paiseToRupees, toPaise, PricedOrder } from './pricing';
import {
  allowedSources, cancelSources, sourceFilter, PRE_DISPATCH,
  type OrderStatus, type DeliveryMode, type Actor,
} from './order-state';
import type { CartItemsInput, CreateOrderInput } from './order.schemas';

type LeanOrder = IOrder & { _id: Types.ObjectId };

function generateOrderNumber(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = randomBytes(3).toString('hex').toUpperCase();
  return `BX-${ts}-${rand}`;
}

function pricingToAppError(err: unknown): unknown {
  if (!(err instanceof PricingError)) return err;
  if (err.kind === 'MISCONFIGURED') {
    return AppError.conflict(`${err.message}. This item can't be ordered right now.`);
  }
  return AppError.badRequest(err.message);
}

// Runs fn in a MongoDB transaction; the driver retries it on transient write conflicts.
async function inTransaction<T>(fn: (session: ClientSession) => Promise<T>): Promise<T> {
  const session = await mongoose.startSession();
  try {
    let result!: T;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}

// ─── Pricing a cart from trusted product data ───────────────────────────────

type LeanProduct = Pick<
  IProduct,
  'supplierId' | 'name' | 'unit' | 'basePrice' | 'bulkPricing' | 'gstRate' | 'isGstInclusive'
  | 'minOrderQuantity' | 'stockQuantity' | 'status' | 'images'
> & { _id: Types.ObjectId };

type PricedCart = {
  supplierId: Types.ObjectId;
  products: LeanProduct[];
  priced: PricedOrder;
};

async function priceCart(items: CartItemsInput, session?: ClientSession): Promise<PricedCart> {
  const ids = items.map((i) => i.productId);
  const found = await Product.find({ _id: { $in: ids } }).session(session ?? null).lean<LeanProduct[]>();
  const byId = new Map(found.map((p) => [p._id.toString(), p]));

  const products = items.map((i) => {
    const p = byId.get(i.productId);
    if (!p || p.status !== 'ACTIVE') throw AppError.conflict(`${p?.name ?? 'A product'} is no longer available`);
    return p;
  });

  const supplierIds = new Set(products.map((p) => p.supplierId.toString()));
  if (supplierIds.size > 1) throw AppError.badRequest('All items in one order must be from the same supplier');

  try {
    const priced = priceOrder(items.map((i, idx) => ({ product: products[idx], quantity: i.quantity })));
    return { supplierId: products[0].supplierId, products, priced };
  } catch (err) {
    throw pricingToAppError(err);
  }
}

function lineView(p: PricedCart['products'][number], line: PricedOrder['lines'][number]) {
  return {
    productId: p._id,
    name: p.name,
    imageUrl: p.images?.find((img) => img.isPrimary)?.url ?? p.images?.[0]?.url ?? '',
    unit: p.unit,
    quantity: line.quantity,
    pricePerUnit: paiseToRupees(line.unitPricePaise),
    listPrice: paiseToRupees(line.listPricePaise),
    tierMinQty: line.tierMinQty ?? undefined,
    gstRate: p.gstRate,
    isGstInclusive: p.isGstInclusive,
    subtotal: paiseToRupees(line.grossPaise),
    taxableValue: paiseToRupees(line.taxablePaise),
    gstAmount: paiseToRupees(line.gstPaise),
    lineTotal: paiseToRupees(line.totalPaise),
  };
}

// POST /orders/quote — same pricing as order creation, no writes
export async function quoteOrder(items: CartItemsInput) {
  const { supplierId, products, priced } = await priceCart(items);
  return {
    supplierId,
    items: products.map((p, i) => ({
      ...lineView(p, priced.lines[i]),
      inStock: p.stockQuantity >= priced.lines[i].quantity,
      stockQuantity: p.stockQuantity,
    })),
    subtotal: paiseToRupees(priced.subtotalPaise),
    gstAmount: paiseToRupees(priced.gstPaise),
    deliveryCharge: 0,
    total: paiseToRupees(priced.totalPaise),
  };
}

// ─── Creating an order ──────────────────────────────────────────────────────

function hashRequest(input: CreateOrderInput): string {
  const { expectedTotal: _ignored, ...material } = input;
  return createHash('sha256').update(JSON.stringify(material)).digest('hex');
}

async function findReplay(buyerId: string, idempotencyKey: string, requestHash: string): Promise<LeanOrder | null> {
  const existing = await Order.findOne({ buyerId, idempotencyKey }).lean<LeanOrder>();
  if (existing && existing.requestHash !== requestHash) {
    throw AppError.conflict('This Idempotency-Key was already used for a different order');
  }
  return existing;
}

/**
 * Prices the cart from DB data, deducts stock and creates the order in ONE transaction:
 * either everything commits or nothing does. Stock is decremented with a conditional
 * update (stockQuantity ≥ qty), so two buyers racing for the last units can't both win —
 * the loser's transaction retries on the write conflict, then fails the stock condition.
 */
export async function createOrder(params: {
  buyerId: string;
  input: CreateOrderInput;
  idempotencyKey: string;
}): Promise<{ order: LeanOrder; replayed: boolean }> {
  const { buyerId, input, idempotencyKey } = params;
  const requestHash = hashRequest(input);

  const replay = await findReplay(buyerId, idempotencyKey, requestHash);
  if (replay) return { order: replay, replayed: true };

  try {
    const order = await inTransaction(async (session) => {
      const { supplierId, products, priced } = await priceCart(input.items, session);

      if (input.expectedTotal !== undefined && toPaise(input.expectedTotal) !== priced.totalPaise) {
        throw AppError.conflict('Prices changed since you reviewed your order. Please check the new total.');
      }

      for (const [i, p] of products.entries()) {
        const qty = priced.lines[i].quantity;
        const res = await Product.updateOne(
          { _id: p._id, status: 'ACTIVE', stockQuantity: { $gte: qty } },
          { $inc: { stockQuantity: -qty, totalSold: qty } },
          { session }
        );
        if (res.modifiedCount !== 1) {
          throw AppError.conflict(`Only ${p.stockQuantity} ${p.unit} of ${p.name} left in stock`);
        }
      }

      const now = new Date();
      const [created] = await Order.create(
        [
          {
            orderNumber: generateOrderNumber(),
            buyerId,
            supplierId,
            items: products.map((p, i) => lineView(p, priced.lines[i])),
            deliveryAddress: input.deliveryAddress,
            deliveryMethod: input.deliveryMethod,
            deliveryCharge: 0,
            subtotal: paiseToRupees(priced.subtotalPaise),
            gstAmount: paiseToRupees(priced.gstPaise),
            total: paiseToRupees(priced.totalPaise),
            notes: input.notes,
            paymentMethod: 'COD',
            paymentStatus: 'PENDING',
            status: 'CONFIRMED',
            confirmedAt: now,
            inventoryState: 'DEDUCTED',
            idempotencyKey,
            requestHash,
            statusHistory: [{ status: 'CONFIRMED', at: now, byRole: 'BUYER', byUserId: buyerId }],
          },
        ],
        { session }
      );
      return created.toObject() as LeanOrder;
    });
    return { order, replayed: false };
  } catch (err: any) {
    // A concurrent duplicate committed first: our transaction (and its stock changes) rolled back
    if (err?.code === 11000 && err?.keyPattern?.idempotencyKey) {
      const existing = await findReplay(buyerId, idempotencyKey, requestHash);
      if (existing) return { order: existing, replayed: true };
    }
    throw err;
  }
}

// ─── Status transitions ─────────────────────────────────────────────────────

type HistoryRole = OrderStatusEvent['byRole'];

function historyEntry(status: OrderStatus, byRole: HistoryRole, userId?: string, note?: string): OrderStatusEvent {
  return { status, at: new Date(), byRole, byUserId: userId ? new Types.ObjectId(userId) : undefined, note };
}

function modeOf(order: Pick<LeanOrder, 'deliveryMode'>): DeliveryMode {
  return order.deliveryMode === 'SUPPLIER' ? 'SUPPLIER' : 'PLATFORM';
}

async function resolveFailedTransition(
  filter: Record<string, unknown>,
  to: OrderStatus,
  mode?: DeliveryMode
): Promise<LeanOrder> {
  const current = await Order.findOne(filter).lean<LeanOrder>();
  if (!current) throw AppError.notFound('Order');
  // Repeated request: already done (in the same delivery mode), no side effects
  if (current.status === to && (!mode || PRE_DISPATCH.includes(to) || modeOf(current) === mode)) return current;
  throw AppError.conflict(`Order is ${current.status} and can't be moved to ${to}`);
}

/**
 * Compare-and-set transition. `filter` must scope the order to the caller (ownership);
 * allowed sources (and, after dispatch, the delivery mode) come from order-state.ts.
 * Returns changed=false when the order was already in the target status.
 */
export async function transitionOrder(params: {
  filter: Record<string, unknown>;
  to: Exclude<OrderStatus, 'CANCELLED'>;
  actor: Exclude<Actor, 'BUYER'>;
  mode: DeliveryMode;
  userId: string;
  historyRole?: HistoryRole;
  set?: Record<string, unknown>;
  unset?: string[];
  note?: string;
}): Promise<{ order: LeanOrder; changed: boolean }> {
  const { filter, to, actor, mode, userId, set = {}, unset = [], note } = params;
  const historyRole = params.historyRole ?? (actor as HistoryRole);
  const sources = allowedSources(to, actor, mode);
  if (sources.length === 0) throw AppError.forbidden(`${actor} can't set status ${to}`);

  const update: Record<string, unknown> = {
    $set: { status: to, ...set },
    $push: { statusHistory: historyEntry(to, historyRole, userId, note) },
  };
  if (unset.length) update.$unset = Object.fromEntries(unset.map((k) => [k, '']));

  const order = await Order.findOneAndUpdate(
    { $and: [filter, sourceFilter(sources, mode)] },
    update,
    { new: true }
  ).lean<LeanOrder>();
  if (order) return { order, changed: true };
  return { order: await resolveFailedTransition(filter, to, mode), changed: false };
}

/**
 * Cancels in one transaction. `inventoryState` changes in the same compare-and-set as the
 * status, so stock is given back exactly once even under retries or concurrent requests.
 * Only ops may cancel after dispatch, and must say whether the goods came back (restock).
 */
export async function cancelOrder(params: {
  filter: Record<string, unknown>;
  actor: 'BUYER' | 'SUPPLIER' | 'OPS';
  userId: string;
  historyRole?: HistoryRole;
  reason?: string;
  restock?: boolean;
  /** Extra condition applied only to the compare-and-set (e.g. "not yet picked up") */
  guard?: Record<string, unknown>;
}): Promise<{ order: LeanOrder; changed: boolean }> {
  const { filter, actor, userId, reason, restock = true, guard = {} } = params;
  const historyRole = params.historyRole ?? (actor as HistoryRole);
  const sources = cancelSources(actor);

  const cancelled = await inTransaction(async (session) => {
    const order = await Order.findOneAndUpdate(
      { $and: [filter, guard, { status: { $in: sources }, inventoryState: { $nin: ['RESTORED', 'NOT_RESTORED'] } }] },
      {
        $set: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelledBy: actor,
          cancellationReason: reason,
          inventoryState: restock ? 'RESTORED' : 'NOT_RESTORED',
        },
        $push: { statusHistory: historyEntry('CANCELLED', historyRole, userId, reason) },
      },
      { new: true, session }
    ).lean<LeanOrder>();
    if (!order) return null;

    if (restock && order.items.length > 0) {
      await Product.bulkWrite(
        order.items.map((item) => ({
          updateOne: {
            filter: { _id: item.productId },
            update: { $inc: { stockQuantity: item.quantity, totalSold: -item.quantity } },
          },
        })),
        { session }
      );
    }
    return order;
  });

  if (cancelled) return { order: cancelled, changed: true };
  return { order: await resolveFailedTransition(filter, 'CANCELLED'), changed: false };
}

/**
 * COD is collected only when whoever delivered (assigned driver, or the supplier in SUPPLIER
 * mode) explicitly confirms the exact amount after delivery. Delivery alone never changes
 * paymentStatus. `filter` must scope the order to that collector.
 */
export async function recordCodCollected(params: {
  filter: Record<string, unknown>;
  collectorUserId: string;
  collectorRole: 'DELIVERY_PARTNER' | 'SUPPLIER';
  amount: number;
}) {
  const { filter, collectorUserId, collectorRole, amount } = params;

  const current = await Order.findOne(filter).lean<LeanOrder>();
  if (!current) throw AppError.notFound('Order');
  if (current.paymentMethod !== 'COD') throw AppError.conflict('This order is not cash on delivery');
  if (current.paymentStatus === 'CAPTURED') return { order: current, changed: false };
  if (current.status !== 'DELIVERED') throw AppError.conflict('Mark the order delivered before confirming cash');
  if (current.paymentStatus !== 'PENDING') throw AppError.conflict('Payment is being handled by BuildX support');
  if (toPaise(amount) !== toPaise(current.total)) {
    throw AppError.badRequest(
      `Collected amount must equal the order total of ₹${current.total}. For a short payment, contact BuildX support.`
    );
  }

  const order = await Order.findOneAndUpdate(
    { ...filter, status: 'DELIVERED', paymentMethod: 'COD', paymentStatus: 'PENDING' },
    {
      $set: {
        paymentStatus: 'CAPTURED',
        codAmountCollected: current.total,
        codCollectedAt: new Date(),
        codCollectedBy: collectorUserId,
        codCollectedByRole: collectorRole,
      },
    },
    { new: true }
  ).lean<LeanOrder>();
  if (order) return { order, changed: true };

  const latest = await Order.findOne(filter).lean<LeanOrder>();
  if (latest?.paymentStatus === 'CAPTURED') return { order: latest, changed: false };
  throw AppError.conflict('Order changed while confirming payment. Please refresh.');
}

/**
 * Ops records the total cash actually received for a delivered COD order — used when the
 * collector forgot to confirm, or the buyer paid short (→ PARTIAL). A note is mandatory.
 */
export async function recordCodByOps(params: {
  orderId: string;
  amount: number;
  note: string;
  opsUserId: string;
  opsRole: 'OPERATOR' | 'ADMIN';
}) {
  const { orderId, amount, note, opsUserId, opsRole } = params;
  const current = await Order.findById(orderId).lean<LeanOrder>();
  if (!current) throw AppError.notFound('Order');
  if (current.paymentMethod !== 'COD') throw AppError.conflict('This order is not cash on delivery');
  if (current.status !== 'DELIVERED') throw AppError.conflict('Cash can only be recorded for delivered orders');
  const paid = toPaise(amount);
  const total = toPaise(current.total);
  if (paid <= 0 || paid > total) {
    throw AppError.badRequest(`Amount must be between ₹0.01 and the order total ₹${current.total}`);
  }
  if (current.paymentStatus === 'CAPTURED') {
    if (paid === total) return { order: current, changed: false };
    throw AppError.conflict('This order is already fully paid');
  }

  const order = await Order.findOneAndUpdate(
    { _id: orderId, status: 'DELIVERED', paymentMethod: 'COD', paymentStatus: { $in: ['PENDING', 'PARTIAL'] } },
    {
      $set: {
        paymentStatus: paid === total ? 'CAPTURED' : 'PARTIAL',
        codAmountCollected: paiseToRupees(paid),
        codCollectedAt: new Date(),
        codCollectedBy: opsUserId,
        codCollectedByRole: opsRole,
      },
      $push: {
        opsNotes: { at: new Date(), byUserId: opsUserId, byRole: opsRole, note: `COD recorded ₹${paiseToRupees(paid)}: ${note}` },
      },
    },
    { new: true }
  ).lean<LeanOrder>();
  if (!order) throw AppError.conflict('Order changed while recording payment. Please refresh.');
  return { order, changed: true };
}
