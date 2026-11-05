import { Schema, model, Document, Types } from 'mongoose';

// A kind of vehicle Sthiva's delivery partners use, with the rates an admin set for it.
// Nothing is seeded: admins add every vehicle type and its numbers in the ops console.
export interface IVehicleType extends Document {
  _id: Types.ObjectId;
  code: string;          // e.g. MINI_TRUCK; matches DeliveryPartner.vehicleType
  name: string;          // shown to people, e.g. "Mini truck"
  maxLoadKg: number;     // most it can carry in one trip
  baseFare: number;      // rupees per trip
  perKmRate: number;     // rupees per km from supplier to site
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const vehicleTypeSchema = new Schema<IVehicleType>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, match: /^[A-Z][A-Z0-9_]{1,29}$/ },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    maxLoadKg: { type: Number, required: true, min: 1 },
    baseFare: { type: Number, required: true, min: 0 },
    perKmRate: { type: Number, required: true, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const VehicleType = model<IVehicleType>('VehicleType', vehicleTypeSchema);
