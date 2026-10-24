import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { seedUser, seedSupplier, startDb, stopDb, clearDb, makeApp } from './helpers';

const mocks = vi.hoisted(() => ({
  uploadImage: vi.fn(async () => ({
    publicId: 'buildx/products/abc123',
    url: 'http://res.cloudinary.com/buildx/image/upload/v1/buildx/products/abc123.jpg',
    secureUrl: 'https://res.cloudinary.com/buildx/image/upload/v1/buildx/products/abc123.jpg',
    format: 'jpg',
    width: 1200,
    height: 1200,
    bytes: 54321,
  })),
}));

vi.mock('../src/infrastructure/storage/cloudinary.client', () => ({
  StorageService: { uploadImage: mocks.uploadImage },
}));

const app = makeApp();
const URL_ = '/api/v1/upload/image';
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);

beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => {
  vi.clearAllMocks();
  await clearDb();
});

describe('POST /upload/image', () => {
  it('rejects unauthenticated requests', async () => {
    const res = await request(app).post(URL_).attach('image', jpeg, 'photo.jpg');
    expect(res.status).toBe(401);
    expect(mocks.uploadImage).not.toHaveBeenCalled();
  });

  it('rejects a buyer (supplier-only endpoint)', async () => {
    const { headers } = await seedUser('buyer1', { role: 'BUYER' });
    const res = await request(app).post(URL_).set(headers).attach('image', jpeg, 'photo.jpg');
    expect(res.status).toBe(403);
    expect(mocks.uploadImage).not.toHaveBeenCalled();
  });

  it('rejects a request with no file', async () => {
    const { headers } = await seedSupplier('sup1');
    const res = await request(app).post(URL_).set(headers);
    expect(res.status).toBe(400);
    expect(mocks.uploadImage).not.toHaveBeenCalled();
  });

  it('rejects a non-image file', async () => {
    const { headers } = await seedSupplier('sup2');
    const res = await request(app)
      .post(URL_)
      .set(headers)
      .attach('image', Buffer.from('not an image'), { filename: 'notes.txt', contentType: 'text/plain' });
    expect(res.status).toBe(400);
    expect(mocks.uploadImage).not.toHaveBeenCalled();
  });

  it('uploads a valid image for a supplier and returns its URL', async () => {
    const { headers } = await seedSupplier('sup3');
    const res = await request(app).post(URL_).set(headers).attach('image', jpeg, 'photo.jpg');
    expect(res.status).toBe(201);
    expect(res.body.data).toEqual({
      url: 'https://res.cloudinary.com/buildx/image/upload/v1/buildx/products/abc123.jpg',
      publicId: 'buildx/products/abc123',
    });
    expect(mocks.uploadImage).toHaveBeenCalledWith(
      expect.stringMatching(/^data:image\/jpeg;base64,/),
      'products',
      { width: 1200, height: 1200 }
    );
  });
});
