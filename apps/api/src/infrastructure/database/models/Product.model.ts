import { Schema, model, Document, Types } from 'mongoose';

export interface IProduct extends Document {
  _id: Types.ObjectId;
  supplierId: Types.ObjectId;
  categoryId: Types.ObjectId;
  name: string;
  slug: string;
  description: string;
  shortDescription?: string;
  images: { url: string; publicId: string; altText?: string; isPrimary: boolean; sortOrder: number }[];
  unit: 'KG' | 'TON' | 'PIECE' | 'BAG' | 'BUNDLE' | 'CUBIC_METER' | 'SQUARE_METER' | 'LITER' | 'METER';
  basePrice: number;
  bulkPricing: { minQty: number; price: number }[];
  minOrderQuantity: number;
  stockQuantity: number;
  lowStockAlert: number;
  weight?: number;
  specifications: Record<string, string>;
  tags: string[];
  status: 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'OUT_OF_STOCK' | 'DISCONTINUED';
  isFeatured: boolean;
  avgRating: number;
  totalReviews: number;
  totalSold: number;
  isGstInclusive: boolean;
  gstRate: number;
  deliveryDays: number;
  location: { lat: number; lng: number; address: string };
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>(
  {
    supplierId: { type: Schema.Types.ObjectId, ref: 'SupplierProfile', required: true, index: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, index: true },
    description: { type: String, required: true },
    shortDescription: String,
    images: [
      {
        url: String,
        publicId: String,
        altText: String,
        isPrimary: { type: Boolean, default: false },
        sortOrder: { type: Number, default: 0 },
      },
    ],
    unit: {
      type: String,
      enum: ['KG', 'TON', 'PIECE', 'BAG', 'BUNDLE', 'CUBIC_METER', 'SQUARE_METER', 'LITER', 'METER'],
      default: 'PIECE',
    },
    basePrice: { type: Number, required: true, min: 0 },
    bulkPricing: [{ minQty: Number, price: Number }],
    minOrderQuantity: { type: Number, default: 1, min: 1 },
    stockQuantity: { type: Number, default: 0, min: 0 },
    lowStockAlert: { type: Number, default: 10 },
    weight: Number,
    specifications: { type: Map, of: String, default: {} },
    tags: [String],
    status: {
      type: String,
      enum: ['DRAFT', 'ACTIVE', 'INACTIVE', 'OUT_OF_STOCK', 'DISCONTINUED'],
      default: 'DRAFT',
      index: true,
    },
    isFeatured: { type: Boolean, default: false, index: true },
    avgRating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0 },
    totalSold: { type: Number, default: 0 },
    isGstInclusive: { type: Boolean, default: true },
    gstRate: { type: Number, default: 18 },
    deliveryDays: { type: Number, default: 2 },
    location: {
      lat: Number,
      lng: Number,
      address: String,
    },
  },
  { timestamps: true }
);

productSchema.index({ status: 1, isFeatured: -1, totalSold: -1 });
productSchema.index({ categoryId: 1, status: 1 });
productSchema.index({ supplierId: 1, status: 1 });
productSchema.index({ name: 'text', shortDescription: 'text', tags: 'text' });

export const Product = model<IProduct>('Product', productSchema);
