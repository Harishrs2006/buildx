import { Schema, model, Document, Types } from 'mongoose';

export interface IOrderItem {
  productId: Types.ObjectId;
  name: string;
  imageUrl: string;
  unit: string;
  quantity: number;
  pricePerUnit: number;    // unit price applied (bulk tier or base), as listed
  listPrice: number;       // product basePrice at order time
  tierMinQty?: number;     // bulk tier applied, if any
  gstRate: number;
  isGstInclusive: boolean;
  subtotal: number;        // pricePerUnit × quantity, as listed
  taxableValue: number;
  gstAmount: number;
  lineTotal: number;
}

export type OrderStatusEvent = {
  status: IOrder['status'];
  at: Date;
  byRole: 'BUYER' | 'SUPPLIER' | 'DELIVERY_PARTNER' | 'SYSTEM';
  byUserId?: Types.ObjectId;
  note?: string;
};

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
  subtotal: number;        // Σ taxable value
  gstAmount: number;       // Σ GST
  total: number;           // amount payable
  status: 'PENDING' | 'CONFIRMED' | 'READY_FOR_PICKUP' | 'ASSIGNED' | 'PICKED_UP' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED' | 'DISPUTED';
  driverId?: Types.ObjectId;
  assignedAt?: Date;
  pickedUpAt?: Date;
  paymentStatus: 'PENDING' | 'CAPTURED' | 'RELEASED' | 'REFUNDED';
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  paymentMethod?: 'UPI' | 'CARD' | 'COD';
  notes?: string;
  confirmedAt?: Date;
  deliveredAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
  cancelledBy?: 'BUYER' | 'SUPPLIER' | 'SYSTEM';
  // DEDUCTED: stock taken at creation. RESTORED: given back on cancel (exactly once).
  inventoryState: 'DEDUCTED' | 'RESTORED';
  idempotencyKey?: string;
  requestHash?: string;
  codAmountCollected?: number;
  codCollectedAt?: Date;
  codCollectedBy?: Types.ObjectId;
  statusHistory: OrderStatusEvent[];
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
        listPrice: Number,
        tierMinQty: Number,
        gstRate: { type: Number, default: 18 },
        isGstInclusive: Boolean,
        subtotal: Number,
        taxableValue: Number,
        gstAmount: Number,
        lineTotal: Number,
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
      enum: ['PENDING', 'CONFIRMED', 'READY_FOR_PICKUP', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED', 'DISPUTED'],
      default: 'PENDING',
      index: true,
    },
    driverId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    assignedAt: Date,
    pickedUpAt: Date,
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
    cancelledBy: { type: String, enum: ['BUYER', 'SUPPLIER', 'SYSTEM'] },
    // Orders created before this field existed had stock deducted at creation too
    inventoryState: { type: String, enum: ['DEDUCTED', 'RESTORED'], default: 'DEDUCTED' },
    idempotencyKey: String,
    requestHash: String,
    codAmountCollected: Number,
    codCollectedAt: Date,
    codCollectedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    statusHistory: [
      {
        _id: false,
        status: String,
        at: Date,
        byRole: { type: String, enum: ['BUYER', 'SUPPLIER', 'DELIVERY_PARTNER', 'SYSTEM'] },
        byUserId: { type: Schema.Types.ObjectId, ref: 'User' },
        note: String,
      },
    ],
  },
  { timestamps: true }
);

// One order per (buyer, Idempotency-Key): a retried or double-tapped checkout can't create a second order
orderSchema.index(
  { buyerId: 1, idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } }
);

export const Order = model<IOrder>('Order', orderSchema);
