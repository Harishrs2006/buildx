import { Request, Response, NextFunction } from 'express';
import { isValidObjectId, Types } from 'mongoose';
import { ok } from '@sthiva/shared';
import { CatalogItem } from '../../infrastructure/database/models/CatalogItem.model';
import { Product } from '../../infrastructure/database/models/Product.model';
import { Category } from '../../infrastructure/database/models/Category.model';
import { SupplierProfile } from '../../infrastructure/database/models/SupplierProfile.model';
import { AppError } from '../../shared/errors/AppError';
import { logger } from '../../shared/logger/logger';
import { createCatalogItem, mergeCatalogItems } from './catalog.service';

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function itemId(req: Request): string {
  const id = String(req.params.id);
  if (!isValidObjectId(id)) throw AppError.badRequest('Invalid item ID');
  return id;
}

/** Name/brand search: every word must appear, in any order. */
function textFilter(q?: string) {
  const words = (q ?? '').trim().split(/\s+/).filter(Boolean).slice(0, 6);
  if (!words.length) return {};
  return { $and: words.map((w) => ({ $or: [{ name: { $regex: escape(w), $options: 'i' } }, { brand: { $regex: escape(w), $options: 'i' } }] })) };
}

// GET /suppliers/me/catalog?q=&categoryId= — items a supplier can list, flagged if already listed
export async function supplierSearch(req: Request, res: Response, next: NextFunction) {
  try {
    const { q, categoryId } = req.query as { q?: string; categoryId?: string };
    const profile = await SupplierProfile.findOne({ userId: req.auth!.userId }).select('_id').lean();
    if (!profile) throw AppError.notFound('Supplier profile');
    const items = await CatalogItem.find({
      status: 'ACTIVE',
      ...(categoryId && isValidObjectId(categoryId) ? { categoryId } : {}),
      ...textFilter(q),
    })
      .select('name brand unit categoryId images gstRate')
      .sort({ name: 1 })
      .limit(20)
      .lean();
    const mine = await Product.find({ supplierId: profile._id, catalogItemId: { $in: items.map((i) => i._id) } })
      .select('catalogItemId').lean();
    const listed = new Map(mine.map((p) => [p.catalogItemId!.toString(), p._id.toString()]));
    res.json(ok(items.map((i) => ({ ...i, myListingId: listed.get(i._id.toString()) ?? null }))));
  } catch (err) { next(err); }
}

// GET /ops/catalog?review=1&q=&page= — items with how many suppliers list each
export async function opsList(req: Request, res: Response, next: NextFunction) {
  try {
    const { q, review, status } = req.query as { q?: string; review?: string; status?: string };
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = 30;
    const filter: Record<string, unknown> = {
      ...textFilter(q),
      ...(review === '1' ? { needsReview: true } : {}),
      ...(status === 'ACTIVE' || status === 'INACTIVE' ? { status } : {}),
    };
    const [items, total] = await Promise.all([
      CatalogItem.find(filter).populate('categoryId', 'name slug').sort({ needsReview: -1, updatedAt: -1 })
        .skip((page - 1) * limit).limit(limit).lean(),
      CatalogItem.countDocuments(filter),
    ]);
    const counts = await Product.aggregate<{ _id: Types.ObjectId; listings: number; live: number }>([
      { $match: { catalogItemId: { $in: items.map((i) => i._id) } } },
      { $group: { _id: '$catalogItemId', listings: { $sum: 1 }, live: { $sum: { $cond: [{ $eq: ['$status', 'ACTIVE'] }, 1, 0] } } } },
    ]);
    const byId = new Map(counts.map((c) => [c._id.toString(), c]));
    res.json(ok(
      items.map((i) => ({ ...i, listings: byId.get(i._id.toString())?.listings ?? 0, liveListings: byId.get(i._id.toString())?.live ?? 0 })),
      { total, page, limit, totalPages: Math.ceil(total / limit), hasNext: page * limit < total, hasPrev: page > 1 }
    ));
  } catch (err) { next(err); }
}

// GET /ops/catalog/:id — the item and every supplier listing of it
export async function opsGet(req: Request, res: Response, next: NextFunction) {
  try {
    const id = itemId(req);
    const item = await CatalogItem.findById(id).populate('categoryId', 'name slug').lean();
    if (!item) throw AppError.notFound('Catalog item');
    const listings = await Product.find({ catalogItemId: id })
      .select('name basePrice isGstInclusive gstRate stockQuantity status supplierId updatedAt')
      .populate('supplierId', 'businessName verificationStatus servicePincodes canDeliver')
      .sort({ basePrice: 1 })
      .lean();
    res.json(ok({ ...item, listingsDetail: listings }));
  } catch (err) { next(err); }
}

// POST /ops/catalog
export async function opsCreate(req: Request, res: Response, next: NextFunction) {
  try {
    if (!(await Category.exists({ _id: req.body.categoryId }))) throw AppError.badRequest('That category does not exist');
    const item = await createCatalogItem(req.body, { role: req.auth!.role as 'OPERATOR' | 'ADMIN', userId: new Types.ObjectId(req.auth!.userId) });
    logger.info('[catalog] created by ops', { opsUserId: req.auth!.userId, itemId: item._id });
    res.status(201).json(ok(item));
  } catch (err) { next(err); }
}

// PATCH /ops/catalog/:id — fix details, approve (needsReview: false), switch off
export async function opsUpdate(req: Request, res: Response, next: NextFunction) {
  try {
    const id = itemId(req);
    const body = { ...req.body };
    if (body.categoryId && !(await Category.exists({ _id: body.categoryId }))) throw AppError.badRequest('That category does not exist');
    const unset: Record<string, ''> = {};
    for (const k of ['brand', 'weightKgPerUnit'] as const) {
      if (body[k] === null) { unset[k] = ''; delete body[k]; }
    }
    const item = await CatalogItem.findByIdAndUpdate(
      id,
      { $set: body, ...(Object.keys(unset).length ? { $unset: unset } : {}) },
      { new: true, runValidators: true }
    ).populate('categoryId', 'name slug').lean();
    if (!item) throw AppError.notFound('Catalog item');
    // Listings follow their item's category and unit, so every supplier's listing stays comparable
    if (body.categoryId || body.unit) {
      await Product.updateMany({ catalogItemId: id }, { $set: { ...(body.categoryId ? { categoryId: body.categoryId } : {}), ...(body.unit ? { unit: body.unit } : {}) } });
    }
    logger.info('[catalog] updated by ops', { opsUserId: req.auth!.userId, itemId: id, changes: req.body });
    res.json(ok(item));
  } catch (err) { next(err); }
}

// POST /ops/catalog/:id/merge { intoId }
export async function opsMerge(req: Request, res: Response, next: NextFunction) {
  try {
    const id = itemId(req);
    const { intoId } = req.body as { intoId: string };
    const result = await mergeCatalogItems(id, intoId);
    logger.info('[catalog] merged', { opsUserId: req.auth!.userId, from: id, into: intoId, moved: result.moved });
    res.json(ok({ moved: result.moved, intoId }));
  } catch (err) { next(err); }
}
