/**
 * Replace em dashes in catalogue text (product names, descriptions and specs, category text,
 * supplier business names). BuildX copy never uses em dashes; old demo data did.
 * Text written by people (reviews, order notes) is never touched.
 *
 *   npm run fix-dashes --workspace=apps/api -- --dry-run
 *   npm run fix-dashes --workspace=apps/api -- --yes
 *
 * Uses MONGODB_URI from the environment — check which database you are pointing at.
 */
import mongoose from 'mongoose';
import { env } from '../config/env';
import { Product } from '../infrastructure/database/models/Product.model';
import { Category } from '../infrastructure/database/models/Category.model';
import { SupplierProfile } from '../infrastructure/database/models/SupplierProfile.model';

// "A — B" reads as "A, B"; a dash glued to words becomes a hyphen
export function withoutEmDashes(text: string): string {
  return text.replace(/\s*—\s*(?=\S)/g, (m, offset: number) => (offset === 0 ? '' : ', ')).replace(/\s*—\s*$/g, '').replace(/—/g, '-');
}

type Change = { collection: string; id: string; field: string; before: string; after: string };

async function collect(): Promise<{ changes: Change[]; apply: () => Promise<void> }> {
  const changes: Change[] = [];
  const updates: (() => Promise<unknown>)[] = [];

  for (const p of await Product.find({}).lean()) {
    const set: Record<string, unknown> = {};
    for (const field of ['name', 'description'] as const) {
      const v = p[field];
      if (typeof v === 'string' && v.includes('—')) {
        set[field] = withoutEmDashes(v);
        changes.push({ collection: 'products', id: String(p._id), field, before: v, after: set[field] as string });
      }
    }
    const specs = (p.specifications ?? {}) as Record<string, string>;
    for (const [k, v] of Object.entries(specs)) {
      if (typeof v === 'string' && v.includes('—')) {
        set[`specifications.${k}`] = withoutEmDashes(v);
        changes.push({ collection: 'products', id: String(p._id), field: `specifications.${k}`, before: v, after: withoutEmDashes(v) });
      }
    }
    if (Object.keys(set).length) updates.push(() => Product.updateOne({ _id: p._id }, { $set: set }));
  }

  for (const c of await Category.find({}).lean()) {
    const set: Record<string, string> = {};
    for (const field of ['name', 'description'] as const) {
      const v = c[field];
      if (typeof v === 'string' && v.includes('—')) {
        set[field] = withoutEmDashes(v);
        changes.push({ collection: 'categories', id: String(c._id), field, before: v, after: set[field] });
      }
    }
    if (Object.keys(set).length) updates.push(() => Category.updateOne({ _id: c._id }, { $set: set }));
  }

  for (const s of await SupplierProfile.find({}).lean()) {
    const v = s.businessName;
    if (typeof v === 'string' && v.includes('—')) {
      const after = withoutEmDashes(v);
      changes.push({ collection: 'supplierprofiles', id: String(s._id), field: 'businessName', before: v, after });
      updates.push(() => SupplierProfile.updateOne({ _id: s._id }, { $set: { businessName: after } }));
    }
  }

  return { changes, apply: async () => { for (const u of updates) await u(); } };
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  if (!dryRun && !process.argv.includes('--yes')) {
    console.error('Refusing to write without --yes. Run with --dry-run first.');
    process.exit(1);
  }
  const host = new URL(env.MONGODB_URI.replace(/^mongodb(\+srv)?:/, 'http:')).host;
  console.log(`${dryRun ? '[dry run] ' : ''}Checking catalogue text in MongoDB at ${host}...`);
  await mongoose.connect(env.MONGODB_URI, { dbName: 'buildx' });
  const { changes, apply } = await collect();
  for (const c of changes) console.log(`- ${c.collection}/${c.id} ${c.field}\n    "${c.before}"\n  → "${c.after}"`);
  if (!dryRun) await apply();
  console.log(`${dryRun ? '[dry run] would change' : '✓ Changed'} ${changes.length} field(s)`);
  await mongoose.disconnect();
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
