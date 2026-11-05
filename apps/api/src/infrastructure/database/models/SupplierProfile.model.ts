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
  // Has their own vehicle and can deliver orders themselves (else Sthiva's delivery partners do)
  canDeliver: boolean;
  // Where goods are picked up (shop or yard); needed to price delivery by distance
  location?: { lat: number; lng: number };
  serviceAreas: string[];   // free-text town names, display only (mobile shows them)
  // PIN codes this supplier delivers to; each validated against the India Post directory when
  // added (features/serviceability). Empty = serves nowhere — never "everywhere".
  servicePincodes: string[];
  logoUrl?: string;
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  // Verification papers (owner decision 2026-11-05: GST certificate if registered, and a shop licence or
  // Udyam certificate). Private Cloudinary files: only publicId is kept, never a public URL. One per type.
  kycDocuments: {
    type: 'GST' | 'SHOP_LICENSE' | 'UDYAM' | 'AADHAAR' | 'BANK_STATEMENT';
    publicId: string;
    format?: string;
    status?: 'SUBMITTED' | 'ACCEPTED' | 'REJECTED';
    note?: string;
    uploadedAt?: Date;
    reviewedAt?: Date;
    url?: string;      // legacy field, never set by current code
    verified: boolean; // kept in step with status === 'ACCEPTED'
  }[];
  // Weekly availability check (features/suppliers/weekly.ts)
  weeklyConfirmedAt?: Date;
  weeklyReminderFor?: Date; // week start of the last reminder sent
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
    canDeliver: { type: Boolean, default: false },
    location: { _id: false, lat: { type: Number, min: -90, max: 90 }, lng: { type: Number, min: -180, max: 180 } },
    serviceAreas: [String],
    servicePincodes: {
      type: [{ type: String, match: /^[1-9]\d{5}$/ }],
      default: [],
    },
    logoUrl: String,
    verificationStatus: { type: String, enum: ['PENDING', 'VERIFIED', 'REJECTED'], default: 'PENDING' },
    kycDocuments: [
      {
        _id: false,
        type: { type: String, enum: ['GST', 'SHOP_LICENSE', 'UDYAM', 'AADHAAR', 'BANK_STATEMENT'] },
        url: String,
        publicId: String,
        format: String,
        status: { type: String, enum: ['SUBMITTED', 'ACCEPTED', 'REJECTED'], default: 'SUBMITTED' },
        note: { type: String, trim: true, maxlength: 300 },
        uploadedAt: Date,
        reviewedAt: Date,
        verified: { type: Boolean, default: false },
      },
    ],
    weeklyConfirmedAt: Date,
    weeklyReminderFor: Date,
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
