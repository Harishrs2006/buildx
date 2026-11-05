import { Schema, model, Document, Types } from 'mongoose';

export interface IDeliveryPartner extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  vehicleType: 'BIKE' | 'AUTO' | 'MINI_TRUCK' | 'TEMPO' | 'TRUCK' | 'TRACTOR';
  vehicleNumber: string;
  licenseNumber: string;
  serviceAreas: string[];
  isAvailable: boolean;
  // Sthiva checks licence and vehicle before a driver gets jobs. Drivers from before this field
  // existed have no value and are treated as verified.
  verificationStatus?: 'PENDING' | 'VERIFIED' | 'REJECTED';
  totalDeliveries: number;
  avgRating: number;
  totalReviews: number;
  createdAt: Date;
  updatedAt: Date;
}

const deliveryPartnerSchema = new Schema<IDeliveryPartner>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    vehicleType: {
      type: String,
      enum: ['BIKE', 'AUTO', 'MINI_TRUCK', 'TEMPO', 'TRUCK', 'TRACTOR'],
      required: true,
    },
    vehicleNumber: { type: String, required: true, trim: true },
    licenseNumber: { type: String, required: true, trim: true },
    serviceAreas: [String],
    isAvailable: { type: Boolean, default: true },
    verificationStatus: { type: String, enum: ['PENDING', 'VERIFIED', 'REJECTED'], default: 'PENDING' },
    totalDeliveries: { type: Number, default: 0 },
    avgRating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const DeliveryPartner = model<IDeliveryPartner>('DeliveryPartner', deliveryPartnerSchema);

/** May this driver take Sthiva delivery jobs? (Drivers from before verification existed: yes.) */
export function isDriverVerified(p: { verificationStatus?: string | null } | null | undefined): boolean {
  return !!p && (p.verificationStatus === undefined || p.verificationStatus === null || p.verificationStatus === 'VERIFIED');
}
