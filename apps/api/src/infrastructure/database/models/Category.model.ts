import { Schema, model, Document, Types } from 'mongoose';

export interface ICategory extends Document {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  icon?: string;
  parentId?: Types.ObjectId;
  sortOrder: number;
  isActive: boolean;
  // Sthiva commission in percent, set by an admin. Absent = not configured yet.
  commission?: { platformDeliveryPercent?: number; supplierDeliveryPercent?: number };
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, index: true },
    description: String,
    imageUrl: String,
    icon: String,
    parentId: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    commission: {
      _id: false,
      // Sthiva's driver delivers
      platformDeliveryPercent: { type: Number, min: 0, max: 100 },
      // The supplier delivers with their own vehicle
      supplierDeliveryPercent: { type: Number, min: 0, max: 100 },
    },
  },
  { timestamps: true }
);

categorySchema.index({ parentId: 1, isActive: 1 });

export const Category = model<ICategory>('Category', categorySchema);
