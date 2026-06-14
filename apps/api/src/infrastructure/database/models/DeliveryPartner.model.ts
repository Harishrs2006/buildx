import { Schema, model, Document, Types } from 'mongoose';

export interface IDeliveryPartner extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  vehicleType: 'BIKE' | 'AUTO' | 'MINI_TRUCK' | 'TEMPO' | 'TRUCK' | 'TRACTOR';
  vehicleNumber: string;
  licenseNumber: string;
  serviceAreas: string[];
  isAvailable: boolean;
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
    totalDeliveries: { type: Number, default: 0 },
    avgRating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const DeliveryPartner = model<IDeliveryPartner>('DeliveryPartner', deliveryPartnerSchema);
