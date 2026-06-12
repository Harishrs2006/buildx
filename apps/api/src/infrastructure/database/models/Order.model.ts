import { Schema, model, Document, Types } from 'mongoose';

export interface IOrderItem {
  productId: Types.ObjectId;
  name: string;
  imageUrl: string;
  unit: string;
  quantity: number;
  pricePerUnit: number;
  subtotal: number;
}

export interface IOrder extends Document {
  _id: Types.ObjectId;
  orderNumber: string;
  buyerId: Types.ObjectId;
  supplierId: Types.ObjectId;
  items: IOrderItem[];
  deliveryAddress: {
    label: string;
    fullAddress: string;
    lat: number;
    lng: number;
    contactPhone: string;
  };
  deliveryMethod: 'STANDARD' | 'EXPRESS';
  deliveryCharge: number;
  subtotal: number;
  gstAmount: number;
  total: number;
  status: 'PENDING' | 'CONFIRMED' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED' | 'DISPUTED';
  paymentStatus: 'PENDING' | 'CAPTURED' | 'RELEASED' | 'REFUNDED';
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  paymentMethod?: 'UPI' | 'CARD' | 'COD';
  notes?: string;
  confirmedAt?: Date;
  deliveredAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const orderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    buyerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    supplierId: { type: Schema.Types.ObjectId, ref: 'SupplierProfile', required: true, index: true },
    items: [
      {
        productId: { type: Schema.Types.ObjectId, ref: 'Product' },
        name: String,
        imageUrl: String,
        unit: String,
        quantity: Number,
        pricePerUnit: Number,
        subtotal: Number,
      },
    ],
    deliveryAddress: {
      label: String,
      fullAddress: String,
      lat: Number,
      lng: Number,
      contactPhone: String,
    },
    deliveryMethod: { type: String, enum: ['STANDARD', 'EXPRESS'], default: 'STANDARD' },
    deliveryCharge: { type: Number, default: 0 },
    subtotal: { type: Number, required: true },
    gstAmount: { type: Number, required: true },
    total: { type: Number, required: true },
    status: {
      type: String,
      enum: ['PENDING', 'CONFIRMED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED', 'DISPUTED'],
      default: 'PENDING',
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ['PENDING', 'CAPTURED', 'RELEASED', 'REFUNDED'],
      default: 'PENDING',
    },
    razorpayOrderId: String,
    razorpayPaymentId: String,
    paymentMethod: { type: String, enum: ['UPI', 'CARD', 'COD'] },
    notes: String,
    confirmedAt: Date,
    deliveredAt: Date,
    cancelledAt: Date,
    cancellationReason: String,
  },
  { timestamps: true }
);

export const Order = model<IOrder>('Order', orderSchema);
