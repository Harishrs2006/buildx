import { Schema, model, Document, Types } from 'mongoose';

// One document (key 'default') holding platform rules an admin controls.
export interface IPlatformSettings extends Document {
  _id: Types.ObjectId;
  key: 'default';
  // How long a supplier has to accept an order offer before it moves to the next supplier.
  // null = offers never expire on their own; ops moves them by hand.
  offerTimeoutMinutes: number | null;
  // Share of the delivery charge a Sthiva delivery partner earns (percent). null = not set yet.
  driverSharePercent: number | null;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const platformSettingsSchema = new Schema<IPlatformSettings>(
  {
    key: { type: String, enum: ['default'], default: 'default', unique: true },
    offerTimeoutMinutes: { type: Number, min: 1, max: 1440, default: null },
    driverSharePercent: { type: Number, min: 0, max: 100, default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export const PlatformSettings = model<IPlatformSettings>('PlatformSettings', platformSettingsSchema);

/** The settings document, created empty on first use. */
export async function getPlatformSettings() {
  return PlatformSettings.findOneAndUpdate(
    { key: 'default' },
    { $setOnInsert: { key: 'default' } },
    { upsert: true, new: true }
  ).lean();
}
