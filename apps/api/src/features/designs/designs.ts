// Design catalogues: suppliers show real designs they make (kitchens, wardrobes, tile looks...), buyers
// browse them and ask for a quote. Models: Design, DesignRequest.
//
//   supplier adds or edits photos/words ──▶ IN_REVIEW ──ops approves──▶ LIVE (buyers see it)
//                                                     └─ops rejects──▶ REJECTED (with a note)
//   supplier can hide a LIVE design (HIDDEN) and show it again without review
//   buyer request: NEW ──▶ CONTACTED ──▶ QUOTED (price + date) ──▶ ACCEPTED or CLOSED

import { Request, Response, NextFunction } from 'express';
import { isValidObjectId, Types } from 'mongoose';
import { z } from 'zod';
import { ok } from '@sthiva/shared';
import { Design, DESIGN_CATEGORIES, DESIGN_PRICE_UNITS, DESIGN_STYLES, type IDesign } from '../../infrastructure/database/models/Design.model';
import { DesignRequest } from '../../infrastructure/database/models/DesignRequest.model';
import { SupplierProfile } from '../../infrastructure/database/models/SupplierProfile.model';
import { AppError } from '../../shared/errors/AppError';
import { notifyUser } from '../../shared/services/notification.service';
import { eligibleSupplierIds } from '../serviceability/serviceability.service';
import { checkDeliveryDate } from '../orders/delivery-window';

// ─── Schemas ───────────────────────────────────────────────────────────────

const slug = z.string().trim().regex(/^[a-z0-9-]{2,60}$/, 'Invalid type');
const image = z.object({ url: z.string().url().startsWith('https://'), publicId: z.string().min(1).max(300) });
const designFields = {
  categorySlug: z.enum(DESIGN_CATEGORIES),
  kind: slug,
  title: z.string().trim().min(3, 'Give the design a name').max(80),
  style: z.enum(DESIGN_STYLES),
  description: z.string().trim().max(1000),
  materials: z.string().trim().max(200),
  images: z.array(image).min(1, 'Add at least one photo').max(8, 'Up to 8 photos'),
  priceFrom: z.number().positive('Enter your starting price').max(10_000_000),
  priceUnit: z.enum(DESIGN_PRICE_UNITS),
  leadDays: z.object({ min: z.number().int().min(0).max(90), max: z.number().int().min(0).max(90) })
    .refine((d) => d.max >= d.min, 'The longest time must be at least the shortest'),
};
export const createDesignSchema = z.object(designFields).partial({ description: true, materials: true }).strict();
export const updateDesignSchema = z.object({ ...designFields, status: z.enum(['LIVE', 'HIDDEN']) }).partial().strict();
export const reviewDesignSchema = z.object({ status: z.enum(['LIVE', 'REJECTED']), note: z.string().trim().max(300).optional() }).strict()
  .refine((v) => v.status === 'LIVE' || (v.note?.length ?? 0) >= 3, { path: ['note'], message: 'Tell the supplier why (at least 3 characters)' });
export const requestDesignSchema = z.object({
  sitePincode: z.string().regex(/^[1-9]\d{5}$/, 'Enter your 6-digit site PIN code'),
  siteArea: z.string().trim().max(200).optional(),
  phone: z.string().regex(/^(?:\+91)?[6-9]\d{9}$/, 'Enter a 10-digit mobile number'),
  details: z.string().trim().min(10, 'Tell the supplier the sizes or what you need (at least 10 characters)').max(1000),
}).strict();
export const updateRequestSchema = z.object({
  status: z.enum(['CONTACTED', 'QUOTED', 'CLOSED']),
  quote: z.object({
    amount: z.number().positive().max(100_000_000),
    deliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    note: z.string().trim().max(300).optional(),
  }).optional(),
  closedReason: z.string().trim().max(200).optional(),
}).strict().refine((v) => v.status !== 'QUOTED' || v.quote, { path: ['quote'], message: 'Add the price you are quoting' });
export const buyerRequestSchema = z.object({ status: z.enum(['ACCEPTED', 'CLOSED']) }).strict();

// Fields a supplier changes that a reviewer must see again
const REVIEWED_FIELDS = ['title', 'description', 'images', 'materials', 'kind', 'categorySlug'] as const;

const id = (req: Request, what: string, key = 'id') => {
  const v = String(req.params[key]);
  if (!isValidObjectId(v)) throw AppError.badRequest(`Invalid ${what} ID`);
  return v;
};

async function supplierOf(userId: string) {
  const profile = await SupplierProfile.findOne({ userId }).select('_id businessName userId').lean();
  if (!profile) throw AppError.notFound('Supplier profile');
  return profile;
}

// ─── Public (buyers) ───────────────────────────────────────────────────────

/** GET /designs?category=&kinds=a,b&style=&pincode=&page= — live designs from suppliers who can serve. */
export async function listDesigns(req: Request, res: Response, next: NextFunction) {
  try {
    const q = req.query as Record<string, string | undefined>;
    const pincode = q.pincode && /^[1-9]\d{5}$/.test(q.pincode) ? q.pincode : undefined;
    const suppliers = await eligibleSupplierIds(pincode);
    const filter: Record<string, unknown> = { status: 'LIVE', supplierId: { $in: suppliers } };
    if (q.category && (DESIGN_CATEGORIES as readonly string[]).includes(q.category)) filter.categorySlug = q.category;
    const kinds = (q.kinds ?? '').split(',').map((k) => k.trim()).filter((k) => /^[a-z0-9-]{2,60}$/.test(k)).slice(0, 20);
    if (kinds.length) filter.kind = { $in: kinds };
    if (q.style && (DESIGN_STYLES as readonly string[]).includes(q.style)) filter.style = q.style;
    const page = Math.max(1, Math.min(50, Number(q.page) || 1));
    const limit = 24;
    const [designs, total] = await Promise.all([
      Design.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)
        .select('-reviewNote -reviewedAt').populate('supplierId', 'businessName').lean(),
      Design.countDocuments(filter),
    ]);
    res.json(ok({ designs, pagination: { page, limit, total, pages: Math.ceil(total / limit) } }));
  } catch (err) { next(err); }
}

/** GET /designs/:id — one live design. */
export async function getDesign(req: Request, res: Response, next: NextFunction) {
  try {
    const design = await Design.findOne({ _id: id(req, 'design'), status: 'LIVE' })
      .select('-reviewNote -reviewedAt').populate('supplierId', 'businessName').lean();
    if (!design) throw AppError.notFound('Design');
    res.json(ok(design));
  } catch (err) { next(err); }
}

/** POST /designs/:id/requests — a signed-in buyer asks the supplier for a quote. */
export async function requestDesign(req: Request, res: Response, next: NextFunction) {
  try {
    const design = await Design.findOne({ _id: id(req, 'design'), status: 'LIVE' }).lean();
    if (!design) throw AppError.notFound('Design');
    const body = req.body as z.infer<typeof requestDesignSchema>;
    const serving = await eligibleSupplierIds(body.sitePincode);
    if (!serving.some((s) => s.equals(design.supplierId))) {
      throw AppError.conflict('This supplier does not work in your PIN code area yet');
    }
    const buyerId = new Types.ObjectId(req.auth!.userId);
    const open = await DesignRequest.countDocuments({ buyerId, designId: design._id, status: { $in: ['NEW', 'CONTACTED', 'QUOTED'] } });
    if (open > 0) throw AppError.conflict('You already asked for a quote on this design. The supplier will get back to you.');
    const request = await DesignRequest.create({
      designId: design._id,
      supplierId: design.supplierId,
      buyerId,
      designTitle: design.title,
      designImage: design.images[0]?.url,
      sitePincode: body.sitePincode,
      siteArea: body.siteArea,
      phone: body.phone.replace(/^\+91/, ''),
      details: body.details,
    });
    const supplier = await SupplierProfile.findById(design.supplierId).select('userId').lean();
    if (supplier?.userId) {
      notifyUser(supplier.userId.toString(), {
        title: 'New design enquiry',
        body: `A buyer at PIN ${body.sitePincode} wants a quote for "${design.title}".`,
        data: { screen: 'supplier_design_requests', requestId: request._id.toString() },
      });
    }
    res.status(201).json(ok(request));
  } catch (err) { next(err); }
}

/** GET /designs/requests/mine — the buyer's quote requests. */
export async function myDesignRequests(req: Request, res: Response, next: NextFunction) {
  try {
    const requests = await DesignRequest.find({ buyerId: req.auth!.userId }).sort({ createdAt: -1 }).limit(50)
      .populate('supplierId', 'businessName').lean();
    res.json(ok(requests));
  } catch (err) { next(err); }
}

/** PATCH /designs/requests/:id — the buyer accepts a quote or closes the request. */
export async function buyerUpdateRequest(req: Request, res: Response, next: NextFunction) {
  try {
    const { status } = req.body as z.infer<typeof buyerRequestSchema>;
    const current = await DesignRequest.findOne({ _id: id(req, 'request'), buyerId: req.auth!.userId }).lean();
    if (!current) throw AppError.notFound('Request');
    if (status === 'ACCEPTED' && current.status !== 'QUOTED') throw AppError.conflict('There is no quote to accept yet');
    if (current.status === 'ACCEPTED' || current.status === 'CLOSED') throw AppError.conflict('This request is already finished');
    const updated = await DesignRequest.findByIdAndUpdate(current._id, { $set: { status } }, { new: true }).lean();
    const supplier = await SupplierProfile.findById(current.supplierId).select('userId').lean();
    if (supplier?.userId) {
      notifyUser(supplier.userId.toString(), {
        title: status === 'ACCEPTED' ? 'Quote accepted' : 'Enquiry closed by the buyer',
        body: `"${current.designTitle}" at PIN ${current.sitePincode}.`,
        data: { screen: 'supplier_design_requests', requestId: current._id.toString() },
      });
    }
    res.json(ok(updated));
  } catch (err) { next(err); }
}

// ─── Supplier ──────────────────────────────────────────────────────────────

export async function supplierDesigns(req: Request, res: Response, next: NextFunction) {
  try {
    const profile = await supplierOf(req.auth!.userId);
    const designs = await Design.find({ supplierId: profile._id }).sort({ createdAt: -1 }).lean();
    res.json(ok(designs));
  } catch (err) { next(err); }
}

export async function createDesign(req: Request, res: Response, next: NextFunction) {
  try {
    const profile = await supplierOf(req.auth!.userId);
    const count = await Design.countDocuments({ supplierId: profile._id, status: { $ne: 'REJECTED' } });
    if (count >= 100) throw AppError.conflict('Up to 100 designs per supplier');
    const design = await Design.create({ ...req.body, supplierId: profile._id, status: 'IN_REVIEW' });
    res.status(201).json(ok(design));
  } catch (err) { next(err); }
}

export async function updateDesign(req: Request, res: Response, next: NextFunction) {
  try {
    const profile = await supplierOf(req.auth!.userId);
    const current = await Design.findOne({ _id: id(req, 'design'), supplierId: profile._id }).lean<IDesign>();
    if (!current) throw AppError.notFound('Design');
    const changes = { ...req.body } as Partial<IDesign> & { status?: 'LIVE' | 'HIDDEN' };
    const needsReview = REVIEWED_FIELDS.some((k) => changes[k] !== undefined && JSON.stringify(changes[k]) !== JSON.stringify(current[k]));
    // Hide and show again without review, but only a design Sthiva already approved
    if (changes.status === 'LIVE' && current.status !== 'HIDDEN' && current.status !== 'LIVE') throw AppError.conflict('Sthiva reviews this design first');
    if (changes.status === 'HIDDEN' && current.status !== 'LIVE' && current.status !== 'HIDDEN') throw AppError.conflict('Only a live design can be hidden');
    const set: Record<string, unknown> = { ...changes };
    if (needsReview) set.status = 'IN_REVIEW';
    const design = await Design.findByIdAndUpdate(
      current._id,
      { $set: set, ...(needsReview ? { $unset: { reviewNote: '', reviewedAt: '' } } : {}) },
      { new: true, runValidators: true }
    ).lean();
    res.json(ok(design));
  } catch (err) { next(err); }
}

export async function deleteDesign(req: Request, res: Response, next: NextFunction) {
  try {
    const profile = await supplierOf(req.auth!.userId);
    const gone = await Design.findOneAndDelete({ _id: id(req, 'design'), supplierId: profile._id }).lean();
    if (!gone) throw AppError.notFound('Design');
    res.json(ok({ deleted: true }));
  } catch (err) { next(err); }
}

/** GET /suppliers/me/design-requests — enquiries from buyers, newest first, with the buyer's phone. */
export async function supplierDesignRequests(req: Request, res: Response, next: NextFunction) {
  try {
    const profile = await supplierOf(req.auth!.userId);
    const requests = await DesignRequest.find({ supplierId: profile._id }).sort({ createdAt: -1 }).limit(100)
      .populate('buyerId', 'name').lean();
    res.json(ok(requests));
  } catch (err) { next(err); }
}

/** PATCH /suppliers/me/design-requests/:id — mark contacted, send a quote, or close. */
export async function supplierUpdateRequest(req: Request, res: Response, next: NextFunction) {
  try {
    const profile = await supplierOf(req.auth!.userId);
    const body = req.body as z.infer<typeof updateRequestSchema>;
    const current = await DesignRequest.findOne({ _id: id(req, 'request'), supplierId: profile._id }).lean();
    if (!current) throw AppError.notFound('Request');
    if (current.status === 'ACCEPTED' || current.status === 'CLOSED') throw AppError.conflict('This request is already finished');
    if (body.quote?.deliveryDate) {
      const problem = checkDeliveryDate(body.quote.deliveryDate);
      if (problem) throw AppError.badRequest(problem);
    }
    const set: Record<string, unknown> = { status: body.status };
    if (body.status === 'QUOTED' && body.quote) set.quote = { ...body.quote, at: new Date() };
    if (body.status === 'CLOSED' && body.closedReason) set.closedReason = body.closedReason;
    const updated = await DesignRequest.findByIdAndUpdate(current._id, { $set: set }, { new: true }).lean();
    if (body.status === 'QUOTED') {
      notifyUser(current.buyerId.toString(), {
        title: 'You have a quote',
        body: `${profile.businessName} sent a quote for "${current.designTitle}".`,
        data: { screen: 'buyer_design_requests', requestId: current._id.toString() },
      });
    }
    res.json(ok(updated));
  } catch (err) { next(err); }
}

// ─── Ops ───────────────────────────────────────────────────────────────────

/** GET /ops/designs?status=IN_REVIEW — the review queue (or any status). */
export async function opsDesigns(req: Request, res: Response, next: NextFunction) {
  try {
    const status = String(req.query.status ?? 'IN_REVIEW');
    const filter = ['IN_REVIEW', 'LIVE', 'REJECTED', 'HIDDEN'].includes(status) ? { status } : {};
    const designs = await Design.find(filter).sort({ updatedAt: 1 }).limit(100).populate('supplierId', 'businessName').lean();
    res.json(ok(designs));
  } catch (err) { next(err); }
}

/** PATCH /ops/designs/:id { status: LIVE | REJECTED, note } — approve or send back with a reason. */
export async function reviewDesign(req: Request, res: Response, next: NextFunction) {
  try {
    const { status, note } = req.body as z.infer<typeof reviewDesignSchema>;
    const design = await Design.findOneAndUpdate(
      { _id: id(req, 'design'), status: { $in: ['IN_REVIEW', 'LIVE', 'REJECTED'] } },
      status === 'REJECTED'
        ? { $set: { status, reviewNote: note, reviewedAt: new Date() } }
        : { $set: { status, reviewedAt: new Date() }, $unset: { reviewNote: '' } },
      { new: true }
    ).lean();
    if (!design) throw AppError.notFound('Design');
    const supplier = await SupplierProfile.findById(design.supplierId).select('userId').lean();
    if (supplier?.userId) {
      notifyUser(supplier.userId.toString(), {
        title: status === 'LIVE' ? 'Design is live' : 'Design needs changes',
        body: status === 'LIVE' ? `"${design.title}" is now visible to buyers.` : `"${design.title}": ${note}`,
        data: { screen: 'supplier_designs', designId: design._id.toString() },
      });
    }
    res.json(ok(design));
  } catch (err) { next(err); }
}

/** GET /ops/design-requests — every enquiry, newest first. */
export async function opsDesignRequests(_req: Request, res: Response, next: NextFunction) {
  try {
    const requests = await DesignRequest.find().sort({ createdAt: -1 }).limit(200)
      .populate('supplierId', 'businessName').populate('buyerId', 'name').lean();
    res.json(ok(requests));
  } catch (err) { next(err); }
}

