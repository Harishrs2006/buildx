import { Schema, model, Document, Types } from 'mongoose';

export interface IUser extends Document {
  _id: Types.ObjectId;
  phone?: string;
  email?: string;
  firebaseUid: string;
  name: string;
  role: 'BUYER' | 'SUPPLIER' | 'DELIVERY_PARTNER' | 'OPERATOR' | 'ADMIN';
  fcmToken?: string;
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
    // Phone OTP users have a phone; Google sign-in users (seller website) have an email instead
    phone: { type: String },
    email: { type: String, lowercase: true, trim: true },
    firebaseUid: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    role: { type: String, enum: ['BUYER', 'SUPPLIER', 'DELIVERY_PARTNER', 'OPERATOR', 'ADMIN'], default: 'BUYER' },
    fcmToken: { type: String, index: true, sparse: true },
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

// Unique only when set: many Google users have no phone and many phone users have no email.
// Named so they never clash with the old non-partial 'phone_1' index (see dropLegacyUserIndexes).
userSchema.index({ phone: 1 }, { unique: true, name: 'phone_unique_when_set', partialFilterExpression: { phone: { $type: 'string' } } });
userSchema.index({ email: 1 }, { unique: true, name: 'email_unique_when_set', partialFilterExpression: { email: { $type: 'string' } } });

export const User = model<IUser>('User', userSchema);

// Databases created before Google sign-in have a plain unique 'phone_1' index, which treats every
// missing phone as the same value and would allow only one Google user. Safe to run on every start.
export async function dropLegacyUserIndexes(): Promise<void> {
  const indexes = await User.collection.indexes().catch(() => []);
  if (indexes.some((i) => i.name === 'phone_1')) await User.collection.dropIndex('phone_1');
}
