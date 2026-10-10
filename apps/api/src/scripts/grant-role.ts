/**
 * Promote an existing account to an operations role (or change its role).
 * OPERATOR/ADMIN can never be chosen in the app, so this is how ops accounts are created.
 *
 * The person must have signed in to the app once (so their user exists), then:
 *   npm run grant-role --workspace=apps/api -- --phone 9876543210 --role OPERATOR
 *
 * Uses MONGODB_URI from the environment — check which database you are pointing at.
 */
import mongoose from 'mongoose';
import { env } from '../config/env';
import { User } from '../infrastructure/database/models/User.model';
import { ROLES, type UserRole } from '@buildx/shared';

const GRANTABLE: UserRole[] = [ROLES.OPERATOR, ROLES.ADMIN, ROLES.BUYER];

export function normalisePhone(input: string): string {
  const digits = input.replace(/[\s-]/g, '');
  const m = /^(?:\+91)?([6-9]\d{9})$/.exec(digits);
  if (!m) throw new Error(`Not a valid Indian mobile number: ${input}`);
  return `+91${m[1]}`;
}

export async function grantRole(phoneInput: string, role: string) {
  if (!GRANTABLE.includes(role as UserRole)) {
    throw new Error(`Role must be one of ${GRANTABLE.join(', ')} (suppliers/drivers onboard in the app)`);
  }
  const phone = normalisePhone(phoneInput);
  const user = await User.findOneAndUpdate(
    { phone },
    { $set: { role, onboardingComplete: true } },
    { new: true }
  ).select('name phone role isActive').lean();
  if (!user) throw new Error(`No user with phone ${phone}. Ask them to sign in to the app once first.`);
  return user;
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const phone = arg('phone');
  const role = arg('role');
  if (!phone || !role) {
    console.error('Usage: npm run grant-role --workspace=apps/api -- --phone 9876543210 --role OPERATOR');
    process.exit(1);
  }

  const host = new URL(env.MONGODB_URI.replace(/^mongodb(\+srv)?:/, 'http:')).host;
  console.log(`Connecting to MongoDB at ${host}...`);
  await mongoose.connect(env.MONGODB_URI, { dbName: 'buildx' });
  const user = await grantRole(phone, role);
  console.log(`✓ ${user.name} (${user.phone}) is now ${user.role}${user.isActive ? '' : ' — NOTE: account is suspended'}`);
  await mongoose.disconnect();
}

if (require.main === module) {
  main().catch(async (err) => {
    console.error(`grant-role failed: ${err.message}`);
    await mongoose.disconnect();
    process.exit(1);
  });
}
