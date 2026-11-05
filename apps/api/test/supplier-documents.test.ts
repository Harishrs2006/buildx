import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { seedUser, seedSupplier, startDb, stopDb, clearDb, makeApp } from './helpers';

let seq = 0;
const mocks = vi.hoisted(() => ({
  uploadPrivate: vi.fn(async (_file: string, folder: string) => ({ publicId: `buildx/${folder}/doc${++seq}`, format: 'pdf', bytes: 1000 })),
  privateViewUrl: vi.fn((publicId: string) => `https://api.cloudinary.com/download?public_id=${publicId}&signature=x&expires_at=1`),
  deletePrivate: vi.fn(async () => undefined),
}));
vi.mock('../src/infrastructure/storage/cloudinary.client', () => ({ StorageService: mocks }));

const app = makeApp();
const api = (path: string) => `/api/v1${path}`;
const pdf = Buffer.from('%PDF-1.4\n%test\n');
const exe = Buffer.from('MZ');

let supplier: Awaited<ReturnType<typeof seedSupplier>>;
let operator: Awaited<ReturnType<typeof seedUser>>;

beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => {
  vi.clearAllMocks();
  await clearDb();
  supplier = await seedSupplier('supplier');
  operator = await seedUser('operator', { role: 'OPERATOR' });
});

const send = (type: string, file = pdf, name = 'gst.pdf', mime = 'application/pdf') =>
  request(app).post(api('/suppliers/me/documents')).set(supplier.headers).field('type', type).attach('file', file, { filename: name, contentType: mime });

describe('supplier verification documents', () => {
  it('stores the file privately; the supplier never gets a link back', async () => {
    const res = await send('GST');
    expect(res.status).toBe(201);
    expect(mocks.uploadPrivate).toHaveBeenCalledWith(expect.stringMatching(/^data:application\/pdf;base64,/), `kyc/${supplier.profile._id}`);
    expect(res.body.data.documents).toEqual([expect.objectContaining({ type: 'GST', status: 'SUBMITTED', label: 'GST certificate' })]);
    expect(JSON.stringify(res.body)).not.toMatch(/viewUrl|publicId|cloudinary/);
    const mine = await request(app).get(api('/suppliers/me/documents')).set(supplier.headers);
    expect(mine.body.data.documents).toHaveLength(1);
    expect(JSON.stringify(mine.body)).not.toMatch(/viewUrl|publicId/);
  });

  it('replaces a document of the same type and removes the old file', async () => {
    await send('GST');
    const again = await send('GST');
    expect(again.body.data.documents).toHaveLength(1);
    expect(mocks.deletePrivate).toHaveBeenCalledWith(`buildx/kyc/${supplier.profile._id}/doc${seq - 1}`);
  });

  it('rejects unknown types, other file kinds and non-suppliers', async () => {
    expect((await send('AADHAAR')).status).toBe(400);
    expect((await send('GST', exe, 'x.exe', 'application/octet-stream')).status).toBe(400);
    const buyer = await seedUser('buyer');
    expect((await request(app).post(api('/suppliers/me/documents')).set(buyer.headers).field('type', 'GST').attach('file', pdf, 'gst.pdf')).status).toBe(403);
    expect(mocks.uploadPrivate).not.toHaveBeenCalled();
  });

  it('ops get short-lived view links and accept or reject with a reason', async () => {
    await send('SHOP_LICENSE');
    const id = supplier.profile._id;
    expect((await request(app).get(api(`/ops/suppliers/${id}/documents`)).set(supplier.headers)).status).toBe(403);
    const docs = await request(app).get(api(`/ops/suppliers/${id}/documents`)).set(operator.headers);
    expect(docs.body.data.documents[0].viewUrl).toContain('signature');

    const review = (body: object) => request(app).patch(api(`/ops/suppliers/${id}/documents/SHOP_LICENSE`)).set(operator.headers).send(body);
    expect((await review({ status: 'REJECTED' })).status).toBe(400);
    const rejected = await review({ status: 'REJECTED', note: 'Photo is blurred' });
    expect(rejected.body.data.documents[0]).toMatchObject({ status: 'REJECTED', note: 'Photo is blurred' });
    const accepted = await review({ status: 'ACCEPTED' });
    expect(accepted.body.data.documents[0]).toMatchObject({ status: 'ACCEPTED' });
    expect((await request(app).patch(api(`/ops/suppliers/${id}/documents/GST`)).set(operator.headers).send({ status: 'ACCEPTED' })).status).toBe(404);
  });
});
