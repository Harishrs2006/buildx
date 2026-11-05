// Admin analytics for the ops console: sales, Sthiva's share, order flow, top items, and how
// suppliers and drivers respond to offers. Everything is counted from real orders; nothing is estimated.
//
// Periods are counted in India time (IST, UTC+5:30) so "today" matches the team's day.

import { Types } from 'mongoose';
import { Order, type IOrder } from '../../infrastructure/database/models/Order.model';
import { SupplierProfile } from '../../infrastructure/database/models/SupplierProfile.model';
import { User } from '../../infrastructure/database/models/User.model';
import { toPaise, paiseToRupees } from '../orders/pricing';
import { orderAmounts } from '../settlements/settlement.service';

type LeanOrder = IOrder & { _id: Types.ObjectId };

const IST_MS = (5 * 60 + 30) * 60 * 1000;
/** yyyy-mm-dd of the IST calendar day the instant falls on */
export const istDay = (d: Date) => new Date(d.getTime() + IST_MS).toISOString().slice(0, 10);

/** Start of the IST day `days - 1` days before today: a window of `days` whole days including today. */
export function periodStart(days: number, now = new Date()): Date {
  const todayIst = istDay(now);
  const midnightIstUtc = new Date(`${todayIst}T00:00:00.000Z`).getTime() - IST_MS;
  return new Date(midnightIstUtc - (days - 1) * 24 * 60 * 60 * 1000);
}

const FIELDS = 'orderNumber status total deliveryCharge delivery items supplierId driverId deliveryMode createdAt deliveredAt cancelledAt cancelledBy paymentMethod paymentStatus codAmountCollected codCollectedBy codCollectedByRole allocation driverOffer';

type Rate = { offers: number; accepted: number; rejected: number; expired: number };
const rate = (): Rate => ({ offers: 0, accepted: 0, rejected: 0, expired: 0 });

export async function analytics(days: number, now = new Date()) {
  const from = periodStart(days, now);
  // Orders placed in the window, plus orders delivered in it (an order placed earlier can be delivered now)
  const orders = await Order.find({ $or: [{ createdAt: { $gte: from } }, { deliveredAt: { $gte: from } }] })
    .select(FIELDS).lean<LeanOrder[]>();

  // Daily series, every day present even when empty
  const series = new Map<string, { date: string; placed: number; delivered: number; sales: number }>();
  for (let i = 0; i < days; i++) {
    const d = istDay(new Date(from.getTime() + i * 86400000 + IST_MS / 2));
    series.set(d, { date: d, placed: 0, delivered: 0, sales: 0 });
  }

  let placed = 0, cancelled = 0, delivered = 0;
  let salesP = 0, supplierP = 0, driverP = 0;
  const cancelledBy: Record<string, number> = {};
  const items = new Map<string, { name: string; unit: string; quantity: number; sales: number }>();
  const suppliers = new Map<string, Rate & { delivered: number; sales: number }>();
  const drivers = new Map<string, Rate & { delivered: number }>();
  const sup = (id: string) => suppliers.get(id) ?? (suppliers.set(id, { ...rate(), delivered: 0, sales: 0 }), suppliers.get(id)!);
  const drv = (id: string) => drivers.get(id) ?? (drivers.set(id, { ...rate(), delivered: 0 }), drivers.get(id)!);

  for (const o of orders) {
    const placedIn = o.createdAt >= from;
    if (placedIn) {
      placed++;
      const day = series.get(istDay(o.createdAt));
      if (day) day.placed++;
      if (o.status === 'CANCELLED') { cancelled++; const by = o.cancelledBy ?? 'UNKNOWN'; cancelledBy[by] = (cancelledBy[by] ?? 0) + 1; }
      // Offer answers: counted for orders placed in the window
      for (const a of o.allocation?.attempts ?? []) {
        const r = sup(String(a.supplierId));
        r.offers++;
        if (a.outcome === 'ACCEPTED') r.accepted++;
        else if (a.outcome === 'REJECTED') r.rejected++;
        else if (a.outcome === 'EXPIRED') r.expired++;
      }
      for (const a of o.driverOffer?.attempts ?? []) {
        const r = drv(String(a.driverUserId));
        r.offers++;
        if (a.outcome === 'ACCEPTED') r.accepted++;
        else if (a.outcome === 'DECLINED') r.rejected++;
        else if (a.outcome === 'EXPIRED') r.expired++;
      }
    }
    if (o.status === 'DELIVERED' && o.deliveredAt && o.deliveredAt >= from) {
      delivered++;
      const total = toPaise(o.total);
      const a = orderAmounts(o);
      salesP += total;
      supplierP += a.supplier.earned;
      driverP += a.driver?.earned ?? 0;
      const day = series.get(istDay(o.deliveredAt));
      if (day) { day.delivered++; day.sales = paiseToRupees(toPaise(day.sales) + total); }
      const s = sup(String(o.supplierId));
      s.delivered++;
      s.sales = paiseToRupees(toPaise(s.sales) + total);
      if (o.driverId && a.driver) drv(String(o.driverId)).delivered++;
      for (const it of o.items) {
        const key = `${it.name}|${it.unit}`;
        const cur = items.get(key) ?? { name: it.name, unit: it.unit, quantity: 0, sales: 0 };
        cur.quantity += it.quantity;
        cur.sales = paiseToRupees(toPaise(cur.sales) + toPaise(it.lineTotal));
        items.set(key, cur);
      }
    }
  }

  const [supplierNames, driverNames] = await Promise.all([
    SupplierProfile.find({ _id: { $in: [...suppliers.keys()] } }).select('businessName').lean(),
    User.find({ _id: { $in: [...drivers.keys()] } }).select('name phone').lean(),
  ]);
  const sName = new Map(supplierNames.map((s) => [String(s._id), s.businessName]));
  const dName = new Map(driverNames.map((d) => [String(d._id), d.name || d.phone || 'Driver']));
  const acceptRate = (r: Rate) => (r.offers ? Math.round((r.accepted / r.offers) * 100) : null);

  return {
    days,
    from: from.toISOString(),
    totals: {
      placed,
      cancelled,
      delivered,
      // Delivered in the window: what buyers paid, what suppliers and drivers earned, what Sthiva keeps
      sales: paiseToRupees(salesP),
      supplierEarnings: paiseToRupees(supplierP),
      driverEarnings: paiseToRupees(driverP),
      sthivaShare: paiseToRupees(salesP - supplierP - driverP),
      averageOrder: delivered ? paiseToRupees(Math.round(salesP / delivered)) : null,
    },
    cancelledBy,
    series: [...series.values()],
    topItems: [...items.values()].sort((a, b) => b.sales - a.sales).slice(0, 10),
    suppliers: [...suppliers.entries()]
      .map(([id, r]) => ({ id, name: sName.get(id) ?? 'Unknown', ...r, acceptRate: acceptRate(r) }))
      .sort((a, b) => b.sales - a.sales || b.offers - a.offers),
    drivers: [...drivers.entries()]
      .map(([id, r]) => ({ id, name: dName.get(id) ?? 'Unknown', ...r, acceptRate: acceptRate(r) }))
      .sort((a, b) => b.delivered - a.delivered || b.offers - a.offers),
  };
}
