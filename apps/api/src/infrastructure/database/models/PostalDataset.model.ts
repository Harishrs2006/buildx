import { Schema, model, Types } from 'mongoose';

// Bookkeeping for each imported release of the India Post directory. Exactly one READY
// version is `active`; lookups read only that version, so a half-finished import is never
// visible and a bad release can be rolled back by re-activating the previous version.
export interface IPostalDataset {
  _id: Types.ObjectId;
  version: string;            // operator-supplied, e.g. "2025-06"
  sourceFile: string;         // file name only (no local paths)
  sha256: string;
  status: 'IMPORTING' | 'READY' | 'FAILED';
  active: boolean;
  rowsRead: number;
  rowsImported: number;
  rowsSkipped: number;
  pincodeCount: number;
  hasCoordinates: boolean;
  failureReason?: string;
  importedAt: Date;
  activatedAt?: Date;
}

const postalDatasetSchema = new Schema<IPostalDataset>(
  {
    version: { type: String, required: true, unique: true, match: /^[A-Za-z0-9._-]{1,40}$/ },
    sourceFile: { type: String, required: true },
    sha256: { type: String, required: true },
    status: { type: String, enum: ['IMPORTING', 'READY', 'FAILED'], required: true },
    active: { type: Boolean, default: false },
    rowsRead: { type: Number, default: 0 },
    rowsImported: { type: Number, default: 0 },
    rowsSkipped: { type: Number, default: 0 },
    pincodeCount: { type: Number, default: 0 },
    hasCoordinates: { type: Boolean, default: false },
    failureReason: String,
    importedAt: { type: Date, default: Date.now },
    activatedAt: Date,
  },
  { versionKey: false }
);

// At most one active dataset
postalDatasetSchema.index({ active: 1 }, { unique: true, partialFilterExpression: { active: true } });

export const PostalDataset = model<IPostalDataset>('PostalDataset', postalDatasetSchema);
