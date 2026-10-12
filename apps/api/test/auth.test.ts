import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { verifyIdToken, bearer, tokenFor, seedUser, startDb, stopDb, clearDb, makeApp } from './helpers';
import { User } from '../src/infrastructure/database/models/User.model';

const app = makeApp();
const SYNC = '/api/v1/auth/sync';
const ME = '/api/v1/users/me';

beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => {
  await clearDb();
  verifyIdToken.mockClear();
});

describe('invalid credentials', () => {
  it('rejects a missing Authorization header', async () => {
    const sync = await request(app).post(SYNC);
    const me = await request(app).get(ME);
    expect(sync.status).toBe(401);
    expect(me.status).toBe(401);
    expect(sync.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects a non-Bearer Authorization header', async () => {
    const res = await request(app).get(ME).set('Authorization', 'Basic abc');
    expect(res.status).toBe(401);
  });

  for (const token of ['garbage', 'expired', 'revoked', 'disabled']) {
    it(`returns 401 for a ${token} Firebase token (sync and protected routes)`, async () => {
      const sync = await request(app).post(SYNC).set(bearer(token));
      const me = await request(app).get(ME).set(bearer(token));
      expect(sync.status).toBe(401);
      expect(me.status).toBe(401);
      expect(sync.body.error.message).toBe('Invalid or expired token');
    });
  }

  it('verifies tokens with revocation checking enabled', async () => {
    await request(app).post(SYNC).set(bearer(tokenFor('u-rev')));
    expect(verifyIdToken).toHaveBeenCalledWith(expect.any(String), true);
  });

  it('rejects a valid token that has no verified phone number', async () => {
    const res = await request(app).post(SYNC).set(bearer('valid|no-phone-uid|'));
    expect(res.status).toBe(401);
    expect(await User.countDocuments()).toBe(0);
  });

  it('does not mask infrastructure failures as auth failures', async () => {
    const res = await request(app).get(ME).set(bearer('network'));
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
  });
});

describe('new-user authentication', () => {
  it('creates a first-time user from the verified token only', async () => {
    const res = await request(app)
      .post(SYNC)
      .set(bearer('valid|new-uid|+919811111111'))
      // Client-supplied identity/role must be ignored
      .send({ role: 'ADMIN', firebaseUid: 'someone-else', phone: '+910000000000', onboardingComplete: true });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ phone: '+919811111111', role: 'BUYER', onboardingComplete: false });

    const users = await User.find().lean();
    expect(users).toHaveLength(1);
    expect(users[0]).toMatchObject({ firebaseUid: 'new-uid', phone: '+919811111111', role: 'BUYER', isActive: true });
  });

  it('is idempotent — repeated and concurrent syncs create exactly one user', async () => {
    const token = bearer('valid|dup-uid|+919822222222');
    const results = await Promise.all([1, 2, 3].map(() => request(app).post(SYNC).set(token)));
    results.forEach((r) => expect(r.status).toBe(200));
    const again = await request(app).post(SYNC).set(token);
    expect(again.body.data.id).toBe(results[0].body.data.id);
    expect(await User.countDocuments({ firebaseUid: 'dup-uid' })).toBe(1);
  });

  it('can reach protected routes right after its first sync', async () => {
    const token = bearer('valid|fresh-uid|+919833333333');
    expect((await request(app).get(ME).set(token)).status).toBe(401); // not synced yet
    await request(app).post(SYNC).set(token);
    const me = await request(app).get(ME).set(token);
    expect(me.status).toBe(200);
    expect(me.body.data.firebaseUid).toBe('fresh-uid');
  });

  it('returns 409 when the phone is already linked to another Firebase account', async () => {
    const { user } = await seedUser('original-uid');
    const res = await request(app).post(SYNC).set(bearer(`valid|recreated-uid|${user.phone}`));
    expect(res.status).toBe(409);
    expect(await User.countDocuments()).toBe(1);
  });
});

describe('existing-user authentication', () => {
  it('returns the existing user on sync without modifying it', async () => {
    const { user, headers } = await seedUser('existing-uid', { role: 'SUPPLIER', name: 'Ramappa' });
    const res = await request(app).post(SYNC).set(headers);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id: user._id.toString(), role: 'SUPPLIER', name: 'Ramappa', onboardingComplete: true });
  });

  it('authenticates protected routes with the role stored in the DB', async () => {
    const { headers } = await seedUser('buyer-uid', { role: 'BUYER' });
    const res = await request(app).get(ME).set(headers);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ firebaseUid: 'buyer-uid', role: 'BUYER' });
  });

  it('cannot escalate its own role through profile updates', async () => {
    const { user, headers } = await seedUser('climber-uid', { role: 'BUYER' });
    const res = await request(app).patch(ME).set(headers).send({ name: 'Rajan', role: 'ADMIN', isActive: true });
    expect(res.status).toBe(200);
    const fresh = await User.findById(user._id).lean();
    expect(fresh).toMatchObject({ name: 'Rajan', role: 'BUYER' });
  });
});

describe('disabled accounts', () => {
  it('blocks a suspended user on protected routes', async () => {
    const { headers } = await seedUser('suspended-uid', { isActive: false });
    const res = await request(app).get(ME).set(headers);
    expect(res.status).toBe(403);
    expect(res.body.error.message).toMatch(/suspended/i);
  });

  it('blocks a suspended user on sync', async () => {
    const { headers } = await seedUser('suspended-sync-uid', { isActive: false });
    const res = await request(app).post(SYNC).set(headers);
    expect(res.status).toBe(403);
  });
});
