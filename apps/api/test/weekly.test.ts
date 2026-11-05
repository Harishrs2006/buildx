import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { seedUser, seedSupplier, seedProduct, startDb, stopDb, clearDb, makeApp } from './helpers';
import { Product } from '../src/infrastructure/database/models/Product.model';
import { SupplierProfile } from '../src/infrastructure/database/models/SupplierProfile.model';
import { weekStart, sendWeeklyReminders, confirmedSinceRequired } from '../src/features/suppliers/weekly';

const app = makeApp();
const api = (path: string) => `/api/v1${path}`;

let supplier: Awaited<ReturnType<typeof seedSupplier>>;

beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => {
  await clearDb();
  supplier = await seedSupplier('supplier', { weeklyConfirmed: false });
});

describe('weeks', () => {
  it('start Monday 00:00 India time', () => {
    // Sunday 23:00 IST is still the previous week; Monday 00:30 IST is the new one
    expect(weekStart(new Date('2026-11-08T17:30:00Z')).toISOString()).toBe('2026-11-01T18:30:00.000Z');
    expect(weekStart(new Date('2026-11-08T19:00:00Z')).toISOString()).toBe('2026-11-08T18:30:00.000Z');
  });
});

describe('weekly check', () => {
  it('lists every listed item and confirms quantities and prices in one step', async () => {
    const a = await seedProduct(supplier.profile._id, { stockQuantity: 5, basePrice: 400 });
    const b = await seedProduct(supplier.profile._id, { stockQuantity: 0, basePrice: 100, status: 'OUT_OF_STOCK' });
    await seedProduct(supplier.profile._id, { status: 'DRAFT' });

    const week = (await request(app).get(api('/suppliers/me/weekly')).set(supplier.headers)).body.data;
    expect(week.confirmedThisWeek).toBe(false);
    expect(week.items.map((i: { _id: string }) => i._id).sort()).toEqual([String(a._id), String(b._id)].sort());

    const confirm = (items: object[]) => request(app).post(api('/suppliers/me/weekly')).set(supplier.headers).send({ items });
    expect((await confirm([{ productId: String(a._id), stockQuantity: 0, basePrice: 410 }])).status).toBe(400); // b missing
    const res = await confirm([
      { productId: String(a._id), stockQuantity: 0, basePrice: 410 },
      { productId: String(b._id), stockQuantity: 20, basePrice: 120 },
    ]);
    expect(res.status).toBe(200);
    expect(await Product.findById(a._id).lean()).toMatchObject({ stockQuantity: 0, basePrice: 410, status: 'OUT_OF_STOCK' });
    expect(await Product.findById(b._id).lean()).toMatchObject({ stockQuantity: 20, basePrice: 120, status: 'ACTIVE' });
    expect((await request(app).get(api('/suppliers/me/weekly')).set(supplier.headers)).body.data.confirmedThisWeek).toBe(true);
  });

  it("refuses another supplier's items and buyers", async () => {
    const other = await seedSupplier('other');
    const theirs = await seedProduct(other.profile._id);
    await seedProduct(supplier.profile._id);
    const res = await request(app).post(api('/suppliers/me/weekly')).set(supplier.headers)
      .send({ items: [{ productId: String(theirs._id), stockQuantity: 1, basePrice: 1 }] });
    expect(res.status).toBe(400);
    const buyer = await seedUser('buyer');
    expect((await request(app).get(api('/suppliers/me/weekly')).set(buyer.headers)).status).toBe(403);
  });
});

describe('Monday reminders', () => {
  const monday10 = new Date('2026-11-09T04:30:00Z'); // Monday 10:00 IST
  it('go once a week, after 09:00 IST on Monday, to verified suppliers who have not confirmed', async () => {
    await SupplierProfile.updateOne({ _id: supplier.profile._id }, { verificationStatus: 'VERIFIED' });
    await seedProduct(supplier.profile._id);
    expect(await sendWeeklyReminders(new Date('2026-11-09T02:00:00Z'))).toBe(0); // 07:30 IST, too early
    expect(await sendWeeklyReminders(monday10)).toBe(1);
    expect(await sendWeeklyReminders(monday10)).toBe(0); // already reminded this week
    // Tuesday: past the deadline, one "your items are hidden" notice
    expect(await sendWeeklyReminders(new Date('2026-11-10T04:30:00Z'))).toBe(1);
    expect(await sendWeeklyReminders(new Date('2026-11-11T04:30:00Z'))).toBe(0);
  });

  it('skip suppliers who already confirmed this week', async () => {
    await SupplierProfile.updateOne({ _id: supplier.profile._id }, { verificationStatus: 'VERIFIED', weeklyConfirmedAt: new Date('2026-11-09T03:00:00Z') });
    await seedProduct(supplier.profile._id);
    expect(await sendWeeklyReminders(monday10)).toBe(0);
  });

  it('send no hidden notice before the rule starts', async () => {
    await SupplierProfile.updateOne({ _id: supplier.profile._id }, { verificationStatus: 'VERIFIED' });
    await seedProduct(supplier.profile._id);
    expect(await sendWeeklyReminders(new Date('2026-11-05T04:30:00Z'))).toBe(0); // Thursday before the first deadline
  });
});

describe('compulsory Monday check', () => {
  it('is not enforced before the end of Monday 9 Nov 2026', () => {
    expect(confirmedSinceRequired(new Date('2026-11-09T18:29:00Z'))).toBeNull();
    expect(confirmedSinceRequired(new Date('2026-11-09T18:30:00Z'))?.toISOString()).toBe('2026-11-08T18:30:00.000Z');
  });

  it("on Monday last week's check still counts; from Tuesday it must be this week's", () => {
    const monday = new Date('2026-11-16T10:00:00Z'); // Monday 16 Nov, 15:30 IST
    expect(confirmedSinceRequired(monday)?.toISOString()).toBe('2026-11-08T18:30:00.000Z');
    const tuesday = new Date('2026-11-17T00:00:00Z'); // Tuesday 05:30 IST
    expect(confirmedSinceRequired(tuesday)?.toISOString()).toBe('2026-11-15T18:30:00.000Z');
  });

  it('hides a supplier who has not confirmed from the shop until they do', async () => {
    const p = await seedProduct(supplier.profile._id, { stockQuantity: 5 });
    const listed = async () => (await request(app).get(api('/products'))).body.products.length;
    try {
      // A Tuesday after the rule starts (only the clock is faked; timers stay real for the database)
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-11-17T06:00:00Z'));
      expect(await listed()).toBe(0);
      const week = (await request(app).get(api('/suppliers/me/weekly')).set(supplier.headers)).body.data;
      expect(week.hidden).toBe(true);
      await request(app).post(api('/suppliers/me/weekly')).set(supplier.headers)
        .send({ items: [{ productId: String(p._id), stockQuantity: 5, basePrice: 400 }] });
      expect(await listed()).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
