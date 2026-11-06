import { Schema, model, Types } from 'mongoose';

// A buyer asks a supplier for a quote on one of their designs. The supplier calls or visits, then
// sends a quote (price and the date they can deliver or fit it). Payment and work are arranged
// between them for now; ops can see every request.
export type DesignRequestStatus = 'NEW' | 'CONTACTED' | 'QUOTED' | 'ACCEPTED' | 'CLOSED';

export interface IDesignRequest {
  _id: Types.ObjectId;
  designId: Types.ObjectId;
  supplierId: Types.ObjectId;
  buyerId: Types.ObjectId;
  // Snapshot so the request still reads well if the design changes later
  designTitle: string;
  designImage?: string;
  sitePincode: string;
  siteArea?: string; // locality or address line the buyer chose to share
  phone: string;
  details: string; // sizes, rooms, wishes
  status: DesignRequestStatus;
  quote?: { amount: number; deliveryDate?: string; note?: string; at: Date };
  closedReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const designRequestSchema = new Schema<IDesignRequest>(
  {
    designId: { type: Schema.Types.ObjectId, ref: 'Design', required: true, index: true },
    supplierId: { type: Schema.Types.ObjectId, ref: 'SupplierProfile', required: true, index: true },
    buyerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    designTitle: { type: String, required: true },
    designImage: String,
    sitePincode: { type: String, required: true, match: /^[1-9]\d{5}$/ },
    siteArea: { type: String, trim: true, maxlength: 200 },
    phone: { type: String, required: true },
    details: { type: String, required: true, trim: true, maxlength: 1000 },
    status: { type: String, enum: ['NEW', 'CONTACTED', 'QUOTED', 'ACCEPTED', 'CLOSED'], default: 'NEW', index: true },
    quote: {
      amount: Number,
      deliveryDate: { type: String, match: /^\d{4}-\d{2}-\d{2}$/ },
      note: { type: String, maxlength: 300 },
      at: Date,
    },
    closedReason: { type: String, maxlength: 200 },
  },
  { timestamps: true }
);

designRequestSchema.index({ supplierId: 1, createdAt: -1 });
designRequestSchema.index({ buyerId: 1, createdAt: -1 });

export const DesignRequest = model<IDesignRequest>('DesignRequest', designRequestSchema);
