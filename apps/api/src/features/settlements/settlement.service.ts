// Settlements: what Sthiva owes each supplier and delivery partner for delivered orders, less any
// buyer cash they collected and kept.
//
// An order counts once its cash is confirmed (paymentStatus CAPTURED or PARTIAL): before that
// nobody knows who holds the money. Each order is counted in at most one statement per party
// (Order.supplierSettlementId / driverSettlementId). Cancelling an unpaid statement frees its orders.
// Amounts come from the same rules the supplier already sees on each order (commission.ts).

import mongoose, { Types, type ClientSession } from 'mongoose';
import { randomBytes } from 'crypto';
import { Order, type IOrder } from '../../infrastructure/database/models/Order.model';
import { Settlement, type SettlementParty, type ISettlementOrder } from '../../infrastructure/database/models/Settlement.model';
import { SupplierProfile } from '../../infrastructure/database/models/SupplierProfile.model';
import { User } from '../../infrastructure/database/models/User.model';
import { AppError } from '../../shared/errors/AppError';
import { supplierEarnings } from '../orders/commission';
import { toPaise, paiseToRupees } from '../orders/pricing';

type LeanOrder = IOrder & { _id: Types.ObjectId };

const PAID_STATES = ['CAPTURED', 'PARTIAL'];
const ORDER_FIELDS = 'orderNumber supplierId driverId deliveryMode deliveredAt total items deliveryCharge delivery paymentMethod paymentStatus codAmountCollected codCollectedBy codCollectedByRole supplierSettlementId driverSettlementId';

function modeOf(o: Pick<LeanOrder, 'deliveryMode' | 'driverId'>): 'PLATFORM' | 'SUPPLIER' {
  if (o.deliveryMode) return o.deliveryMode;
  return o.driverId ? 'PLATFORM' : 'SUPPLIER';
}

/** Cash from the buyer that this party collected and kept, in paise. */
function cashHeldBy(o: LeanOrder, party: SettlementParty): number {
  if (o.paymentMethod !== 'COD' || !o.codAmountCollected) return 0;
  const role = o.codCollectedByRole;
  if (party === 'SUPPLIER' && role === 'SUPPLIER') return toPaise(o.codAmountCollected);
  if (party === 'DRIVER' && role === 'DELIVERY_PARTNER' && o.driverId && String(o.codCollectedBy) === String(o.driverId)) {
    return toPaise(o.codAmountCollected);
  }
  return 0; // collected by Sthiva's team, or not collected
}

/** What each side earned and holds on one delivered order, in paise. Driver is null when no Sthiva driver delivered. */
export function orderAmounts(o: LeanOrder) {
  const mode = modeOf(o);
  const e = supplierEarnings({ ...o, deliveryMode: mode });
  const supplier = { earned: toPaise(e.expectedPayout ?? 0), cashHeld: cashHeldBy(o, 'SUPPLIER') };
  const driver = mode === 'PLATFORM' && o.driverId
    ? { earned: toPaise(e.driverPayout ?? 0), cashHeld: cashHeldBy(o, 'DRIVER') }
    : null;
  return { supplier, driver };
}

function unsettledFilter(party: SettlementParty, partyId?: string): Record<string, unknown> {
  const f: Record<string, unknown> = { status: 'DELIVERED', paymentStatus: { $in: PAID_STATES } };
  if (party === 'SUPPLIER') {
    f.supplierSettlementId = { $exists: false };
    if (partyId) f.supplierId = new Types.ObjectId(partyId);
  } else {
    f.driverSettlementId = { $exists: false };
    f.driverId = partyId ? new Types.ObjectId(partyId) : { $exists: true };
    f.deliveryMode = { $ne: 'SUPPLIER' };
  }
  return f;
}

/** The order lines a statement for this party would hold. Driver orders with nothing either way are left out. */
function linesFor(party: SettlementParty, orders: LeanOrder[]): ISettlementOrder[] {
  const lines: ISettlementOrder[] = [];
  for (const o of orders) {
    const a = orderAmounts(o);
    const side = party === 'SUPPLIER' ? a.supplier : a.driver;
    if (!side) continue;
    if (party === 'DRIVER' && side.earned === 0 && side.cashHeld === 0) continue;
    lines.push({
      orderId: o._id, orderNumber: o.orderNumber, deliveredAt: o.deliveredAt,
      earned: paiseToRupees(side.earned), cashHeld: paiseToRupees(side.cashHeld),
    });
  }
  return lines;
}

function totals(lines: ISettlementOrder[]) {
  const earned = lines.reduce((s, l) => s + toPaise(l.earned), 0);
  const cashHeld = lines.reduce((s, l) => s + toPaise(l.cashHeld), 0);
  return { earned: paiseToRupees(earned), cashHeld: paiseToRupees(cashHeld), net: paiseToRupees(earned - cashHeld) };
}

const partyKey = (party: SettlementParty, o: LeanOrder) => String(party === 'SUPPLIER' ? o.supplierId : o.driverId);

async function partyNames(party: SettlementParty, ids: string[]): Promise<Map<string, string>> {
  if (party === 'SUPPLIER') {
    const rows = await SupplierProfile.find({ _id: { $in: ids } }).select('businessName').lean();
    return new Map(rows.map((r) => [String(r._id), r.businessName]));
  }
  const rows = await User.find({ _id: { $in: ids } }).select('name phone').lean();
  return new Map(rows.map((r) => [String(r._id), r.name || r.phone || 'Driver']));
}

/** Delivered orders whose cash is not confirmed yet, per party: they join a statement once it is. */
async function waitingForCash(party: SettlementParty, partyId?: string) {
  const f: Record<string, unknown> = { status: 'DELIVERED', paymentStatus: 'PENDING' };
  if (party === 'SUPPLIER') { f.supplierSettlementId = { $exists: false }; if (partyId) f.supplierId = new Types.ObjectId(partyId); }
  else { f.driverSettlementId = { $exists: false }; f.driverId = partyId ? new Types.ObjectId(partyId) : { $exists: true }; f.deliveryMode = { $ne: 'SUPPLIER' }; }
  const rows = await Order.find(f).select('supplierId driverId').lean<LeanOrder[]>();
  const counts = new Map<string, number>();
  for (const o of rows) counts.set(partyKey(party, o), (counts.get(partyKey(party, o)) ?? 0) + 1);
  return counts;
}

export type Balance = {
  party: SettlementParty; partyId: string; partyName: string;
  orders: number; earned: number; cashHeld: number; net: number; waitingForCash: number;
};

/** Unsettled balance for every supplier or driver (or one of them). */
export async function balances(party: SettlementParty, partyId?: string): Promise<Balance[]> {
  const orders = await Order.find(unsettledFilter(party, partyId)).select(ORDER_FIELDS).lean<LeanOrder[]>();
  const byParty = new Map<string, LeanOrder[]>();
  for (const o of orders) {
    const k = partyKey(party, o);
    byParty.set(k, [...(byParty.get(k) ?? []), o]);
  }
  const waiting = await waitingForCash(party, partyId);
  const ids = [...new Set([...byParty.keys(), ...waiting.keys()])];
  const names = await partyNames(party, ids);
  const out: Balance[] = [];
  for (const id of ids) {
    const lines = linesFor(party, byParty.get(id) ?? []);
    const w = waiting.get(id) ?? 0;
    if (lines.length === 0 && w === 0) continue;
    out.push({ party, partyId: id, partyName: names.get(id) ?? 'Unknown', orders: lines.length, ...totals(lines), waitingForCash: w });
  }
  return out.sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
}

async function inTransaction<T>(fn: (session: ClientSession) => Promise<T>): Promise<T> {
  const session = await mongoose.startSession();
  try {
    let result!: T;
    await session.withTransaction(async () => { result = await fn(session); });
    return result;
  } finally {
    await session.endSession();
  }
}

function settlementNumber() {
  const d = new Date();
  const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `ST-${ymd}-${randomBytes(3).toString('hex').toUpperCase()}`;
}

/** Puts every unsettled order of one supplier or driver into a new statement. */
export async function createSettlement(party: SettlementParty, partyId: string, adminUserId: string) {
  if (!Types.ObjectId.isValid(partyId)) throw AppError.badRequest('Invalid party ID');
  const names = await partyNames(party, [partyId]);
  const partyName = names.get(partyId);
  if (!partyName) throw AppError.notFound(party === 'SUPPLIER' ? 'Supplier' : 'Driver');

  return inTransaction(async (session) => {
    const orders = await Order.find(unsettledFilter(party, partyId)).select(ORDER_FIELDS).session(session).lean<LeanOrder[]>();
    const lines = linesFor(party, orders);
    if (lines.length === 0) throw AppError.conflict('Nothing to settle: no delivered orders with confirmed cash');
    const id = new Types.ObjectId();
    const link = party === 'SUPPLIER' ? 'supplierSettlementId' : 'driverSettlementId';
    const claimed = await Order.updateMany(
      { _id: { $in: lines.map((l) => l.orderId) }, [link]: { $exists: false } },
      { $set: { [link]: id } },
      { session }
    );
    if (claimed.modifiedCount !== lines.length) throw AppError.conflict('Orders changed while settling. Please try again.');
    const [doc] = await Settlement.create([{
      _id: id, number: settlementNumber(), party,
      ...(party === 'SUPPLIER' ? { supplierId: partyId } : { driverUserId: partyId }),
      partyName, orders: lines, ...totals(lines), createdBy: adminUserId,
    }], { session });
    return doc.toObject();
  });
}

export async function markPaid(id: string, adminUserId: string, reference: string, note?: string) {
  if (!Types.ObjectId.isValid(id)) throw AppError.badRequest('Invalid settlement ID');
  const doc = await Settlement.findOneAndUpdate(
    { _id: id, status: 'PENDING' },
    { $set: { status: 'PAID', paidAt: new Date(), paidBy: adminUserId, reference, ...(note ? { note } : {}) } },
    { new: true }
  ).lean();
  if (doc) return doc;
  const current = await Settlement.findById(id).lean();
  if (!current) throw AppError.notFound('Settlement');
  throw AppError.conflict(current.status === 'PAID' ? 'Already marked paid' : 'This statement was cancelled');
}

/** Cancels an unpaid statement; its orders go back to the unsettled balance. */
export async function cancelSettlement(id: string, adminUserId: string, reason: string) {
  if (!Types.ObjectId.isValid(id)) throw AppError.badRequest('Invalid settlement ID');
  return inTransaction(async (session) => {
    const doc = await Settlement.findOneAndUpdate(
      { _id: id, status: 'PENDING' },
      { $set: { status: 'CANCELLED', cancelledAt: new Date(), cancelledBy: adminUserId, cancelReason: reason } },
      { new: true, session }
    ).lean();
    if (!doc) {
      const current = await Settlement.findById(id).session(session).lean();
      if (!current) throw AppError.notFound('Settlement');
      throw AppError.conflict(current.status === 'PAID' ? 'A paid statement cannot be cancelled' : 'Already cancelled');
    }
    const link = doc.party === 'SUPPLIER' ? 'supplierSettlementId' : 'driverSettlementId';
    await Order.updateMany({ [link]: doc._id }, { $unset: { [link]: 1 } }, { session });
    return doc;
  });
}

export async function listSettlements(filter: { party?: SettlementParty; status?: string; supplierId?: string; driverUserId?: string }, limit = 100) {
  const q: Record<string, unknown> = {};
  if (filter.party) q.party = filter.party;
  if (filter.status) q.status = filter.status;
  if (filter.supplierId) q.supplierId = filter.supplierId;
  if (filter.driverUserId) q.driverUserId = filter.driverUserId;
  return Settlement.find(q).sort({ createdAt: -1 }).limit(limit).lean();
}

export async function getSettlement(id: string, scope: Record<string, unknown> = {}) {
  if (!Types.ObjectId.isValid(id)) throw AppError.badRequest('Invalid settlement ID');
  const doc = await Settlement.findOne({ _id: id, ...scope }).lean();
  if (!doc) throw AppError.notFound('Settlement');
  return doc;
}

/** A supplier's or driver's own view: unsettled balance plus their statements (no admin details). */
export async function myView(party: SettlementParty, partyId: string): Promise<{ balance: Omit<Balance, 'partyName'> & { partyName?: string }; settlements: Record<string, unknown>[] }> {
  const [bal, list] = await Promise.all([
    balances(party, partyId),
    listSettlements(party === 'SUPPLIER' ? { supplierId: partyId } : { driverUserId: partyId }, 50),
  ]);
  return {
    balance: bal[0] ?? { party, partyId, orders: 0, earned: 0, cashHeld: 0, net: 0, waitingForCash: 0 },
    settlements: list
      .filter((s) => s.status !== 'CANCELLED')
      .map(({ createdBy: _c, paidBy: _p, cancelledBy: _x, ...rest }) => rest as Record<string, unknown>),
  };
}
