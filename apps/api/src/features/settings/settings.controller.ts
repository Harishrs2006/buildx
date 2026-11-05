import { Request, Response, NextFunction } from 'express';
import { isValidObjectId, Types } from 'mongoose';
import { ok } from '@sthiva/shared';
import { Category } from '../../infrastructure/database/models/Category.model';
import { VehicleType } from '../../infrastructure/database/models/VehicleType.model';
import { PlatformSettings, getPlatformSettings } from '../../infrastructure/database/models/PlatformSettings.model';
import { AppError } from '../../shared/errors/AppError';
import { logger } from '../../shared/logger/logger';
import { slugify } from '../catalog/catalog.service';

// Admin-controlled platform rules: commission per category, delivery vehicles and rates,
// supplier offer timeout. Operators can read them; only admins change them.

function audit(req: Request, what: string, detail: Record<string, unknown>) {
  logger.info('[settings] change', { adminUserId: req.auth!.userId, what, ...detail });
}

function id(req: Request, label: string): string {
  const v = String(req.params.id);
  if (!isValidObjectId(v)) throw AppError.badRequest(`Invalid ${label} ID`);
  return v;
}

// GET /ops/settings
export async function getSettings(_req: Request, res: Response, next: NextFunction) {
  try {
    const [categories, vehicles, general] = await Promise.all([
      Category.find({}).select('name slug description isActive commission sortOrder').sort({ sortOrder: 1, name: 1 }).lean(),
      VehicleType.find({}).sort({ maxLoadKg: 1 }).lean(),
      getPlatformSettings(),
    ]);
    res.json(ok({
      categories: categories.map((c) => ({
        _id: c._id,
        name: c.name,
        slug: c.slug,
        description: c.description ?? null,
        sortOrder: c.sortOrder ?? 0,
        isActive: c.isActive,
        platformDeliveryPercent: c.commission?.platformDeliveryPercent ?? null,
        supplierDeliveryPercent: c.commission?.supplierDeliveryPercent ?? null,
      })),
      vehicles,
      offerTimeoutMinutes: general?.offerTimeoutMinutes ?? null,
      driverSharePercent: general?.driverSharePercent ?? null,
      driverOfferTimeoutMinutes: general?.driverOfferTimeoutMinutes ?? null,
    }));
  } catch (err) { next(err); }
}

// PATCH /ops/settings/commission/:id
export async function setCommission(req: Request, res: Response, next: NextFunction) {
  try {
    const categoryId = id(req, 'category');
    const { platformDeliveryPercent, supplierDeliveryPercent } = req.body as { platformDeliveryPercent: number | null; supplierDeliveryPercent: number | null };
    const update: Record<string, unknown> = {};
    const unset: Record<string, ''> = {};
    for (const [k, v] of Object.entries({ platformDeliveryPercent, supplierDeliveryPercent })) {
      if (v === null) unset[`commission.${k}`] = '';
      else update[`commission.${k}`] = v;
    }
    const category = await Category.findByIdAndUpdate(
      categoryId,
      { ...(Object.keys(update).length ? { $set: update } : {}), ...(Object.keys(unset).length ? { $unset: unset } : {}) },
      { new: true, runValidators: true }
    ).lean();
    if (!category) throw AppError.notFound('Category');
    audit(req, 'commission', { categoryId, platformDeliveryPercent, supplierDeliveryPercent });
    res.json(ok({
      _id: category._id,
      name: category.name,
      platformDeliveryPercent: category.commission?.platformDeliveryPercent ?? null,
      supplierDeliveryPercent: category.commission?.supplierDeliveryPercent ?? null,
    }));
  } catch (err) { next(err); }
}

// POST /ops/settings/categories — a new category starts with no commission, so it stays out of the
// shop until an admin sets its rate
export async function createCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, description, sortOrder } = req.body as { name: string; description?: string; sortOrder?: number };
    const slug = slugify(name);
    if (await Category.exists({ slug })) throw AppError.conflict(`A category called "${name}" already exists`);
    const category = await Category.create({ name, slug, description, sortOrder: sortOrder ?? 0, isActive: true });
    audit(req, 'category created', { categoryId: String(category._id), name, slug });
    res.status(201).json(ok(category));
  } catch (err) { next(err); }
}

// PATCH /ops/settings/categories/:id — rename, describe, reorder, show or hide (slug never changes)
export async function updateCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const categoryId = id(req, 'category');
    const category = await Category.findByIdAndUpdate(categoryId, { $set: req.body }, { new: true, runValidators: true }).lean();
    if (!category) throw AppError.notFound('Category');
    audit(req, 'category updated', { categoryId, ...req.body });
    res.json(ok(category));
  } catch (err) { next(err); }
}

// POST /ops/settings/vehicles
export async function createVehicle(req: Request, res: Response, next: NextFunction) {
  try {
    const exists = await VehicleType.exists({ code: req.body.code });
    if (exists) throw AppError.conflict(`A vehicle type with code ${req.body.code} already exists`);
    const vehicle = await VehicleType.create(req.body);
    audit(req, 'vehicle created', { vehicle: vehicle.toObject() });
    res.status(201).json(ok(vehicle));
  } catch (err) { next(err); }
}

// PATCH /ops/settings/vehicles/:id
export async function updateVehicle(req: Request, res: Response, next: NextFunction) {
  try {
    const vehicleId = id(req, 'vehicle');
    const vehicle = await VehicleType.findByIdAndUpdate(vehicleId, { $set: req.body }, { new: true, runValidators: true }).lean();
    if (!vehicle) throw AppError.notFound('Vehicle type');
    audit(req, 'vehicle updated', { vehicleId, changes: req.body });
    res.json(ok(vehicle));
  } catch (err) { next(err); }
}

// PATCH /ops/settings/general
export async function updateGeneral(req: Request, res: Response, next: NextFunction) {
  try {
    const changes = req.body as { offerTimeoutMinutes?: number | null; driverSharePercent?: number | null; driverOfferTimeoutMinutes?: number | null };
    const settings = await PlatformSettings.findOneAndUpdate(
      { key: 'default' },
      { $set: { ...changes, updatedBy: new Types.ObjectId(req.auth!.userId) } },
      { upsert: true, new: true, runValidators: true }
    ).lean();
    audit(req, 'general', changes);
    res.json(ok({ offerTimeoutMinutes: settings!.offerTimeoutMinutes ?? null, driverSharePercent: settings!.driverSharePercent ?? null, driverOfferTimeoutMinutes: settings!.driverOfferTimeoutMinutes ?? null }));
  } catch (err) { next(err); }
}
