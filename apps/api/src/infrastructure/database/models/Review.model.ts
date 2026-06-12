import { Schema, model, Document, Types } from 'mongoose';

export interface IReview extends Document {
  _id: Types.ObjectId;
  reviewerId: Types.ObjectId;
  supplierId: Types.ObjectId;
  productId: Types.ObjectId;
  orderId: Types.ObjectId;
  rating: number;
  comment?: string;
  images: string[];
  isVerifiedPurchase: boolean;
  createdAt: Date;
}

const reviewSchema = new Schema<IReview>(
  {
    reviewerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    supplierId: { type: Schema.Types.ObjectId, ref: 'SupplierProfile', required: true, index: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, unique: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: String,
    images: [String],
    isVerifiedPurchase: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Review = model<IReview>('Review', reviewSchema);
