import mongoose, { HydratedDocument, Model, Schema } from 'mongoose';

export type PurchaseStatus = 'pending' | 'completed' | 'failed';

export interface IPurchase {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  stripeSessionId: string;
  packageId: string;
  credits: number;
  amountCents: number;
  currency: string;
  status: PurchaseStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type PurchaseDocument = HydratedDocument<IPurchase>;

const purchaseSchema = new Schema<IPurchase>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    stripeSessionId: { type: String, required: true, unique: true },
    packageId: { type: String, required: true },
    credits: { type: Number, required: true },
    amountCents: { type: Number, required: true },
    currency: { type: String, default: 'usd' },
    status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
  },
  { timestamps: true }
);

export const Purchase: Model<IPurchase> = mongoose.model<IPurchase>('Purchase', purchaseSchema);
