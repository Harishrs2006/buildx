import { Schema, model, Types } from 'mongoose';

// A design a supplier can make: a modular kitchen, a wardrobe, a tile look, a ceiling. Buyers browse
// designs and ask the supplier for a quote (DesignRequest). Photos are the supplier's own work, so a
// design goes live only after Sthiva reviews it; editing the photos or words sends it back to review.

export const DESIGN_CATEGORIES = ['modular-woodwork', 'walls-ceilings', 'tiles-flooring', 'doors-windows', 'bath-kitchen'] as const;
export const DESIGN_STYLES = ['Modern', 'Contemporary', 'Minimal', 'Traditional', 'Classic', 'Industrial'] as const;
export const DESIGN_PRICE_UNITS = ['PER_SQFT', 'PER_RUNNING_FT', 'PER_PIECE', 'PER_BOX'] as const;
export type DesignStatus = 'IN_REVIEW' | 'LIVE' | 'REJECTED' | 'HIDDEN';

export interface IDesign {
  _id: Types.ObjectId;
  supplierId: Types.ObjectId;
  categorySlug: (typeof DESIGN_CATEGORIES)[number];
  kind: string; // catalogue item id, e.g. "modular-kitchen", "wardrobes", "vitrified-tiles"
  title: string;
  style: (typeof DESIGN_STYLES)[number];
  description?: string;
  materials?: string; // e.g. "BWP plywood, acrylic shutters, soft-close hinges"
  images: { url: string; publicId: string }[];
  priceFrom: number; // rupees, the supplier's starting price per unit
  priceUnit: (typeof DESIGN_PRICE_UNITS)[number];
  leadDays: { min: number; max: number }; // usual time from confirmation to fitting or delivery
  status: DesignStatus;
  reviewNote?: string;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const designSchema = new Schema<IDesign>(
  {
    supplierId: { type: Schema.Types.ObjectId, ref: 'SupplierProfile', required: true, index: true },
    categorySlug: { type: String, enum: DESIGN_CATEGORIES, required: true, index: true },
    kind: { type: String, required: true, trim: true, maxlength: 60, index: true },
    title: { type: String, required: true, trim: true, maxlength: 80 },
    style: { type: String, enum: DESIGN_STYLES, required: true },
    description: { type: String, trim: true, maxlength: 1000 },
    materials: { type: String, trim: true, maxlength: 200 },
    images: [{ _id: false, url: { type: String, required: true }, publicId: { type: String, required: true } }],
    priceFrom: { type: Number, required: true, min: 1 },
    priceUnit: { type: String, enum: DESIGN_PRICE_UNITS, required: true },
    leadDays: { min: { type: Number, required: true, min: 0, max: 90 }, max: { type: Number, required: true, min: 0, max: 90 } },
    status: { type: String, enum: ['IN_REVIEW', 'LIVE', 'REJECTED', 'HIDDEN'], default: 'IN_REVIEW', index: true },
    reviewNote: { type: String, maxlength: 300 },
    reviewedAt: Date,
  },
  { timestamps: true }
);

designSchema.index({ status: 1, categorySlug: 1, createdAt: -1 });

export const Design = model<IDesign>('Design', designSchema);
