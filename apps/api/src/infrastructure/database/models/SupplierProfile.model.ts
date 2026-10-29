import { Schema, model, Document, Types } from 'mongoose';

export interface ISupplierProfile extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  businessName: string;
  description?: string;
  // How the business sells, as Indian trade knows it
  businessType?: 'RETAILER' | 'DEALER' | 'DISTRIBUTOR' | 'MANUFACTURER';
  gstin?: string; // 15-character GST identification number, optional (small traders may be unregistered)
  address?: string; // shop or yard address
  categories: string[]; // category slugs the supplier sells in
  brands: string[]; // brands the supplier deals in (dealership / stockist)
  deliveryRadiusKm: number;
  serviceAreas: string[];   // free-text town names, display only (mobile shows them)
  // PIN codes this supplier delivers to; each validated against the India Post directory when
  // added (features/serviceability). Empty = serves nowhere — never "everywhere".
  servicePincodes: string[];
  logoUrl?: string;
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  kycDocuments: {
    type: 'AADHAAR' | 'GST' | 'BANK_STATEMENT' | 'SHOP_LICENSE';
    url: string;
    publicId: string;
    verified: boolean;
  }[];
  avgRating: number;
  totalReviews: number;
  totalDeliveries: number;
  whatsappOnly: boolean;
  whatsappNumber: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const supplierProfileSchema = new Schema<ISupplierProfile>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    businessName: { type: String, required: true, trim: true },
    description: String,
    businessType: { type: String, enum: ['RETAILER', 'DEALER', 'DISTRIBUTOR', 'MANUFACTURER'] },
    gstin: { type: String, uppercase: true, trim: true, match: /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/ },
    address: { type: String, trim: true, maxlength: 300 },
    categories: [{ type: String }],
    brands: { type: [{ type: String, trim: true, maxlength: 60 }], default: [] },
    deliveryRadiusKm: { type: Number, default: 30 },
    serviceAreas: [String],
    servicePincodes: {
      type: [{ type: String, match: /^[1-9]\d{5}$/ }],
      default: [],
    },
    logoUrl: String,
    verificationStatus: { type: String, enum: ['PENDING', 'VERIFIED', 'REJECTED'], default: 'PENDING' },
    kycDocuments: [
      {
        type: { type: String, enum: ['AADHAAR', 'GST', 'BANK_STATEMENT', 'SHOP_LICENSE'] },
        url: String,
        publicId: String,
        verified: { type: Boolean, default: false },
      },
    ],
    avgRating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0 },
    totalDeliveries: { type: Number, default: 0 },
    whatsappOnly: { type: Boolean, default: false },
    whatsappNumber: { type: String, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Which suppliers serve a PIN (multikey)
supplierProfileSchema.index({ servicePincodes: 1, verificationStatus: 1, isActive: 1 });

export const SupplierProfile = model<ISupplierProfile>('SupplierProfile', supplierProfileSchema);
