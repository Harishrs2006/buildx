import { Schema, model, Document, Types } from 'mongoose';

export interface IUser extends Document {
  _id: Types.ObjectId;
  phone: string;
  firebaseUid: string;
  name: string;
  role: 'BUYER' | 'SUPPLIER' | 'OPERATOR' | 'ADMIN';
  aadhaarVerified: boolean;
  gstNumber?: string;
  gstVerified: boolean;
  bankAccount?: {
    accountNumber: string;
    ifsc: string;
    bankName: string;
    verified: boolean;
  };
  addresses: {
    label: string;
    fullAddress: string;
    lat: number;
    lng: number;
    contactPhone: string;
    isDefault: boolean;
  }[];
  avatarUrl?: string;
  isActive: boolean;
  onboardingComplete: boolean;
  preferredLanguage: 'en' | 'kn' | 'hi' | 'te';
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    phone: { type: String, required: true, unique: true, index: true },
    firebaseUid: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    role: { type: String, enum: ['BUYER', 'SUPPLIER', 'OPERATOR', 'ADMIN'], default: 'BUYER' },
    aadhaarVerified: { type: Boolean, default: false },
    gstNumber: { type: String, uppercase: true, sparse: true },
    gstVerified: { type: Boolean, default: false },
    bankAccount: {
      accountNumber: String,
      ifsc: String,
      bankName: String,
      verified: { type: Boolean, default: false },
    },
    addresses: [
      {
        label: String,
        fullAddress: String,
        lat: Number,
        lng: Number,
        contactPhone: String,
        isDefault: { type: Boolean, default: false },
      },
    ],
    avatarUrl: String,
    isActive: { type: Boolean, default: true },
    onboardingComplete: { type: Boolean, default: false },
    preferredLanguage: { type: String, enum: ['en', 'kn', 'hi', 'te'], default: 'en' },
  },
  { timestamps: true }
);

export const User = model<IUser>('User', userSchema);
