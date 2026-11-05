import { Types } from 'mongoose';
import { CatalogItem, ICatalogItem } from '../../infrastructure/database/models/CatalogItem.model';
import { Product } from '../../infrastructure/database/models/Product.model';
import { AppError } from '../../shared/errors/AppError';
import { logger } from '../../shared/logger/logger';

export function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'item';
}

/** Lower-case, single-spaced text for matching names typed by different people. */
export function normaliseName(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

async function uniqueSlug(name: string): Promise<string> {
  const base = slugify(name);
  let slug = base;
  for (let n = 1; await CatalogItem.exists({ slug }); n++) slug = `${base}-${n}`;
  return slug;
}

type NewItem = {
  name: string;
  categoryId: Types.ObjectId | string;
  unit: ICatalogItem['unit'];
  brand?: string;
  description?: string;
  images?: { url: string; publicId: string; altText?: string }[];
  specifications?: Record<string, string>;
  gstRate?: number;
  weightKgPerUnit?: number;
};

/** A new catalog item. Items made by suppliers or by the system wait for an ops check. */
export async function createCatalogItem(input: NewItem, by: ICatalogItem['createdBy']) {
  return CatalogItem.create({
    ...input,
    images: (input.images ?? []).map(({ url, publicId, altText }) => ({ url, publicId, altText })),
    slug: await uniqueSlug(input.brand ? `${input.brand} ${input.name}` : input.name),
    status: 'ACTIVE',
    needsReview: by.role === 'SUPPLIER' || by.role === 'SYSTEM',
    createdBy: by,
  });
}

/** An active item with the same name (ignoring case and punctuation), category and unit, if any. */
export async function findMatchingItem(name: string, categoryId: Types.ObjectId | string, unit: string) {
  const key = normaliseName(name);
  const candidates = await CatalogItem.find({ categoryId, unit, status: 'ACTIVE' }).select('name').lean();
  return candidates.find((c) => normaliseName(c.name) === key) ?? null;
}

/**
 * Listings made before the catalog existed get a catalog item: listings with the same name,
 * category and unit share one. Safe to run on every start; does nothing once all are linked.
 */
export async function linkUnlinkedProducts(): Promise<number> {
  const loose = await Product.find({ catalogItemId: { $exists: false } })
    .select('name categoryId unit description images specifications gstRate supplierId')
    .lean();
  let linked = 0;
  for (const p of loose) {
    const match = await findMatchingItem(p.name, p.categoryId, p.unit);
    let itemId = match?._id;
    if (!itemId) {
      itemId = (await createCatalogItem(
        { name: p.name, categoryId: p.categoryId, unit: p.unit, description: p.description, images: p.images,
          specifications: p.specifications instanceof Map ? Object.fromEntries(p.specifications) : p.specifications, gstRate: p.gstRate },
        { role: 'SYSTEM' }
      ))._id;
    }
    // A supplier with two old listings of the same item keeps the second unlinked for ops to sort out
    const clash = await Product.exists({ supplierId: p.supplierId, catalogItemId: itemId });
    if (clash) continue;
    await Product.updateOne({ _id: p._id, catalogItemId: { $exists: false } }, { $set: { catalogItemId: itemId } });
    linked++;
  }
  if (linked) logger.info('[catalog] linked existing listings to catalog items', { linked });
  return linked;
}

/**
 * Merge a duplicate item into another: its listings move to the target and it is switched off.
 * Refused when a supplier lists both (they must remove one first) or the items differ in unit.
 */
export async function mergeCatalogItems(sourceId: string, targetId: string) {
  if (sourceId === targetId) throw AppError.badRequest('Pick a different item to merge into');
  const [source, target] = await Promise.all([CatalogItem.findById(sourceId), CatalogItem.findById(targetId)]);
  if (!source || !target) throw AppError.notFound('Catalog item');
  if (target.status !== 'ACTIVE') throw AppError.conflict('Merge into an active item');
  if (source.unit !== target.unit) throw AppError.conflict(`Units differ (${source.unit} vs ${target.unit}); fix one first`);

  const [onSource, onTarget] = await Promise.all([
    Product.distinct('supplierId', { catalogItemId: source._id }),
    Product.distinct('supplierId', { catalogItemId: target._id }),
  ]);
  const both = onSource.filter((s) => onTarget.some((t) => t.equals(s)));
  if (both.length) {
    throw AppError.conflict(`${both.length} supplier(s) list both items. Ask them to remove one listing, then merge.`);
  }

  const moved = await Product.updateMany(
    { catalogItemId: source._id },
    { $set: { catalogItemId: target._id, categoryId: target.categoryId } }
  );
  source.status = 'INACTIVE';
  source.needsReview = false;
  source.mergedInto = target._id;
  await source.save();
  return { moved: moved.modifiedCount, target };
}
