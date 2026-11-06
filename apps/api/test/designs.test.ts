import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { seedUser, seedSupplier, startDb, stopDb, clearDb, makeApp } from './helpers';
import { Design } from '../src/infrastructure/database/models/Design.model';
import { SupplierProfile } from '../src/infrastructure/database/models/SupplierProfile.model';
import { istToday } from '../src/features/orders/delivery-window';

const app = makeApp();
const api = (path: string) => `/api/v1${path}`;

let buyer: Awaited<ReturnType<typeof seedUser>>;
let operator: Awaited<ReturnType<typeof seedUser>>;
let a: Awaited<ReturnType<typeof seedSupplier>>;
let b: Awaited<ReturnType<typeof seedSupplier>>;

const KITCHEN = {
  categorySlug: 'modular-woodwork',
  kind: 'modular-kitchen',
  title: 'L-shaped kitchen in walnut and white',
  style: 'Modern',
  materials: 'BWP plywood, acrylic shutters, soft-close hinges',
  images: [{ url: 'https://res.cloudinary.com/demo/image/upload/k1.jpg', publicId: 'k1' }],
  priceFrom: 1450,
  priceUnit: 'PER_SQFT',
  leadDays: { min: 21, max: 28 },
};

beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => {
  await clearDb();
  await Design.deleteMany({});
  buyer = await seedUser('buyer');
  operator = await seedUser('operator', { role: 'OPERATOR' });
  a = await seedSupplier('a', { servicePincodes: ['572103'] });
  b = await seedSupplier('b');
});

const add = (body: object = KITCHEN) => request(app).post(api('/suppliers/me/designs')).set(a.headers).send(body);
const review = (id: string, body: object) => request(app).patch(api(`/ops/designs/${id}`)).set(operator.headers).send(body);
const publicList = (q = '') => request(app).get(api(`/designs${q}`));

async function liveDesign() {
  const created = await add();
  expect(created.status).toBe(201);
  const id = created.body.data._id as string;
  expect((await review(id, { status: 'LIVE' })).status).toBe(200);
  return id;
}

describe('design catalogue', () => {
  it('a new design waits for review; buyers only see it once Sthiva approves', async () => {
    const created = await add();
    expect(created.body.data.status).toBe('IN_REVIEW');
    expect((await publicList()).body.data.designs).toHaveLength(0);
    expect((await request(app).get(api('/ops/designs')).set(operator.headers)).body.data).toHaveLength(1);
    expect((await request(app).get(api('/ops/designs')).set(buyer.headers)).status).toBe(403);

    expect((await review(created.body.data._id, { status: 'REJECTED' })).status).toBe(400); // a rejection needs a reason
    await review(created.body.data._id, { status: 'LIVE' });
    const list = (await publicList('?category=modular-woodwork&kinds=modular-kitchen,wardrobes')).body.data;
    expect(list.designs).toHaveLength(1);
    expect(list.designs[0]).toMatchObject({ title: KITCHEN.title, supplierId: { businessName: expect.any(String) } });
    expect(list.designs[0].reviewNote).toBeUndefined();
    expect((await publicList('?kinds=wardrobes')).body.data.designs).toHaveLength(0);
    expect((await publicList('?style=Traditional')).body.data.designs).toHaveLength(0);
  });

  it('validates what a supplier sends', async () => {
    expect((await add({ ...KITCHEN, images: [] })).status).toBe(400);
    expect((await add({ ...KITCHEN, categorySlug: 'cement-concrete' })).status).toBe(400);
    expect((await add({ ...KITCHEN, leadDays: { min: 10, max: 5 } })).status).toBe(400);
    expect((await add({ ...KITCHEN, priceFrom: 0 })).status).toBe(400);
  });

  it('editing photos or words goes back to review; price changes and hiding do not', async () => {
    const id = await liveDesign();
    const price = await request(app).patch(api(`/suppliers/me/designs/${id}`)).set(a.headers).send({ priceFrom: 1350 });
    expect(price.body.data.status).toBe('LIVE');
    const hidden = await request(app).patch(api(`/suppliers/me/designs/${id}`)).set(a.headers).send({ status: 'HIDDEN' });
    expect(hidden.body.data.status).toBe('HIDDEN');
    expect((await publicList()).body.data.designs).toHaveLength(0);
    expect((await request(app).patch(api(`/suppliers/me/designs/${id}`)).set(a.headers).send({ status: 'LIVE' })).body.data.status).toBe('LIVE');
    const retitled = await request(app).patch(api(`/suppliers/me/designs/${id}`)).set(a.headers).send({ title: 'Parallel kitchen in walnut' });
    expect(retitled.body.data.status).toBe('IN_REVIEW');
    expect((await request(app).patch(api(`/suppliers/me/designs/${id}`)).set(a.headers).send({ status: 'LIVE' })).status).toBe(409);
    // another supplier can't touch it
    expect((await request(app).patch(api(`/suppliers/me/designs/${id}`)).set(b.headers).send({ priceFrom: 1 })).status).toBe(404);
  });

  it('designs from unverified or inactive suppliers are not shown', async () => {
    await liveDesign();
    await SupplierProfile.updateOne({ _id: a.profile._id }, { isActive: false });
    expect((await publicList()).body.data.designs).toHaveLength(0);
  });
});

describe('quote requests', () => {
  const ask = (id: string, body: object = {}) =>
    request(app).post(api(`/designs/${id}/requests`)).set(buyer.headers)
      .send({ sitePincode: '572103', phone: '9876500000', details: 'Kitchen 10 x 8 ft, L-shape, need loft too', ...body });

  it('a buyer asks for a quote, the supplier quotes a price and date, the buyer accepts', async () => {
    const id = await liveDesign();
    expect((await request(app).post(api(`/designs/${id}/requests`)).send({})).status).toBe(401);
    const asked = await ask(id);
    expect(asked.status).toBe(201);
    expect(asked.body.data).toMatchObject({ status: 'NEW', designTitle: KITCHEN.title, sitePincode: '572103' });
    expect((await ask(id)).status).toBe(409); // one open request per design

    const inbox = await request(app).get(api('/suppliers/me/design-requests')).set(a.headers);
    expect(inbox.body.data).toHaveLength(1);
    expect(inbox.body.data[0].phone).toBe('9876500000');
    expect((await request(app).get(api('/suppliers/me/design-requests')).set(b.headers)).body.data).toHaveLength(0);

    const reqId = asked.body.data._id as string;
    const quote = (body: object) => request(app).patch(api(`/suppliers/me/design-requests/${reqId}`)).set(a.headers).send(body);
    expect((await quote({ status: 'QUOTED' })).status).toBe(400); // needs a price
    expect((await quote({ status: 'QUOTED', quote: { amount: 145000, deliveryDate: '2020-01-01' } })).status).toBe(400);
    const sent = await quote({ status: 'QUOTED', quote: { amount: 145000, deliveryDate: istToday(), note: 'Includes loft and fitting' } });
    expect(sent.status).toBe(200);
    expect(sent.body.data.quote).toMatchObject({ amount: 145000, deliveryDate: istToday() });

    const mine = await request(app).get(api('/designs/requests/mine')).set(buyer.headers);
    expect(mine.body.data[0]).toMatchObject({ status: 'QUOTED', quote: { amount: 145000 } });
    const accepted = await request(app).patch(api(`/designs/requests/${reqId}`)).set(buyer.headers).send({ status: 'ACCEPTED' });
    expect(accepted.body.data.status).toBe('ACCEPTED');
    expect((await quote({ status: 'CLOSED' })).status).toBe(409);
    expect((await request(app).get(api('/ops/design-requests')).set(operator.headers)).body.data).toHaveLength(1);
  });

  it('a buyer cannot accept before a quote, and only designs that are live and serve the PIN can be requested', async () => {
    const id = await liveDesign();
    const asked = await ask(id);
    expect((await request(app).patch(api(`/designs/requests/${asked.body.data._id}`)).set(buyer.headers).send({ status: 'ACCEPTED' })).status).toBe(409);
    expect((await ask(id, { sitePincode: '012345' })).status).toBe(400);
    await request(app).patch(api(`/suppliers/me/designs/${id}`)).set(a.headers).send({ status: 'HIDDEN' });
    expect((await request(app).get(api(`/designs/${id}`))).status).toBe(404);
  });
});
