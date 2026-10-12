import { Schema, model, Types } from 'mongoose';

// One row of the official India Post "All India Pincode Directory" (Department of Posts,
// published on data.gov.in under the Government Open Data License – India).
// Rows are imported per dataset version by scripts/import-postal-directory.ts; lookups only
// read the version marked active in PostalDataset. Never edited by hand.
export interface IPostalOffice {
  _id: Types.ObjectId;
  datasetVersion: string;
  pincode: string;
  officeName: string;
  officeType?: string;      // e.g. HO / SO / BO
  deliveryStatus?: string;  // "Delivery" | "Non-Delivery" as published
  division?: string;
  region?: string;
  circle?: string;
  taluk?: string;
  district: string;
  state: string;
  location?: { lat: number; lng: number }; // only when the release includes valid coordinates
}

const postalOfficeSchema = new Schema<IPostalOffice>(
  {
    datasetVersion: { type: String, required: true },
    pincode: { type: String, required: true, match: /^[1-9]\d{5}$/ },
    officeName: { type: String, required: true },
    officeType: String,
    deliveryStatus: String,
    division: String,
    region: String,
    circle: String,
    taluk: String,
    district: { type: String, required: true },
    state: { type: String, required: true },
    location: { _id: false, lat: Number, lng: Number },
  },
  { versionKey: false }
);

postalOfficeSchema.index({ datasetVersion: 1, pincode: 1 });

export const PostalOffice = model<IPostalOffice>('PostalOffice', postalOfficeSchema);
