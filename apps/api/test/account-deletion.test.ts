import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { clearDb, deleteUser, makeApp, seedOrder, seedProduct, seedSupplier, seedUser, startDb, stopDb } from './helpers';
import { User } from '../src/infrastructure/database/models/User.model';
import { Order } from '../src/infrastructure/database/models/Order.model';
import { Product } from '../src/infrastructure/database/models/Product.model';
import { SupplierProfile } from '../src/infrastructure/database/models/SupplierProfile.model';

const app = makeApp();
const ME = '/api/v1/users/me';

beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => {
  deleteUser.mockClear();
  await clearDb();
});

describe('DELETE /users/me', () => {
  it('erases a buyer\'s personal details, keeps their past orders and deletes the Firebase login', async () => {
    const { user, headers } = await seedUser('buyer1');
    await User.updateOne({ _id: user._id }, { addresses: [{ label: 'Site', fullAddress: 'Plot 12, SIT Road', lat: 13.3, lng: 77.1, contactPhone: '9876500000', isDefault: true }] });
    const { profile } = await seedSupplier('sup1');
    const order = await seedOrder(user._id, profile._id, { status: 'DELIVERED' });

    const res = await request(app).delete(ME).set(headers);

    expect(res.status).toBe(200);
    const after = await User.findById(user._id).lean();
    expect(after).toMatchObject({ name: 'Deleted user', isActive: false, addresses: [] });
    expect(after?.phone).toBeUndefined();
    expect(after?.firebaseUid).toBe(`deleted:${user._id}`);
    expect(after?.deletedAt).toBeInstanceOf(Date);
    expect(await Order.exists({ _id: order._id })).toBeTruthy();
    expect(deleteUser).toHaveBeenCalledWith('buyer1');
  });

  it('refuses while the buyer has an open order', async () => {
    const { user, headers } = await seedUser('buyer2');
    const { profile } = await seedSupplier('sup2');
    await seedOrder(user._id, profile._id, { status: 'IN_TRANSIT' });

    const res = await request(app).delete(ME).set(headers);

    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/1 open order/);
    expect((await User.findById(user._id).lean())?.isActive).toBe(true);
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it('refuses while a supplier has an open order to fulfil', async () => {
    const { user: buyer } = await seedUser('buyer3');
    const { headers, profile } = await seedSupplier('sup3');
    await seedOrder(buyer._id, profile._id, { status: 'CONFIRMED' });

    expect((await request(app).delete(ME).set(headers)).status).toBe(409);
  });

  it('takes a supplier\'s listings off sale and closes their profile', async () => {
    const { user, headers, profile } = await seedSupplier('sup4');
    const product = await seedProduct(profile._id);

    expect((await request(app).delete(ME).set(headers)).status).toBe(200);
    expect((await Product.findById(product._id).lean())?.status).toBe('DISCONTINUED');
    expect((await SupplierProfile.findById(profile._id).lean())?.isActive).toBe(false);
    expect((await User.findById(user._id).lean())?.isActive).toBe(false);
  });

  it('lets the same phone sign up again afterwards', async () => {
    const { user, headers } = await seedUser('buyer5');
    await request(app).delete(ME).set(headers);
    await expect(User.create({ firebaseUid: 'buyer5-new', phone: user.phone, name: 'Again' })).resolves.toBeTruthy();
  });

  it('does not let staff close their own account', async () => {
    const { headers } = await seedUser('ops1', { role: 'OPERATOR' });
    expect((await request(app).delete(ME).set(headers)).status).toBe(403);
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it('still succeeds when the Firebase login is already gone', async () => {
    const { headers } = await seedUser('buyer6');
    deleteUser.mockRejectedValueOnce(Object.assign(new Error('gone'), { code: 'auth/user-not-found' }));
    expect((await request(app).delete(ME).set(headers)).status).toBe(200);
  });
});
