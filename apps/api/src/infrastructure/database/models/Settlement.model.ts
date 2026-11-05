import { Schema, model, Document, Types } from 'mongoose';

// A settlement statement: what Sthiva and one supplier or delivery partner owe each other for a set
// of delivered orders. An admin creates it, pays (or collects) outside the app, then marks it paid
// with a reference. Amounts are rupees, worked out in paise (features/settlements).
export type SettlementParty = 'SUPPLIER' | 'DRIVER';

export interface ISettlementOrder {
  orderId: Types.ObjectId;
  orderNumber: string;
  deliveredAt?: Date;
  earned: number;    // what the party earned on this order
  cashHeld: number;  // cash from the buyer that the party collected and kept
}

export interface ISettlement extends Document {
  _id: Types.ObjectId;
  number: string;              // e.g. ST-2611-0001
  party: SettlementParty;
  supplierId?: Types.ObjectId;  // SupplierProfile, when party is SUPPLIER
  driverUserId?: Types.ObjectId; // User, when party is DRIVER
  partyName: string;
  orders: ISettlementOrder[];
  earned: number;
  cashHeld: number;
  // earned − cashHeld. Positive: Sthiva pays the party. Negative: the party pays Sthiva.
  net: number;
  status: 'PENDING' | 'PAID' | 'CANCELLED';
  createdBy: Types.ObjectId;
  paidAt?: Date;
  paidBy?: Types.ObjectId;
  reference?: string;   // UPI / bank reference, or "cash"
  note?: string;
  cancelledAt?: Date;
  cancelledBy?: Types.ObjectId;
  cancelReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const settlementSchema = new Schema<ISettlement>(
  {
    number: { type: String, required: true, unique: true },
    party: { type: String, enum: ['SUPPLIER', 'DRIVER'], required: true },
    supplierId: { type: Schema.Types.ObjectId, ref: 'SupplierProfile', index: true },
    driverUserId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    partyName: { type: String, required: true },
    orders: [
      {
        _id: false,
        orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
        orderNumber: { type: String, required: true },
        deliveredAt: Date,
        earned: { type: Number, required: true },
        cashHeld: { type: Number, required: true },
      },
    ],
    earned: { type: Number, required: true },
    cashHeld: { type: Number, required: true },
    net: { type: Number, required: true },
    status: { type: String, enum: ['PENDING', 'PAID', 'CANCELLED'], default: 'PENDING', index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    paidAt: Date,
    paidBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reference: { type: String, trim: true, maxlength: 100 },
    note: { type: String, trim: true, maxlength: 500 },
    cancelledAt: Date,
    cancelledBy: { type: Schema.Types.ObjectId, ref: 'User' },
    cancelReason: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

export const Settlement = model<ISettlement>('Settlement', settlementSchema);
