import mongoose, { HydratedDocument, Model, Schema } from 'mongoose';

export type CreditTransactionType = 'purchase' | 'spend' | 'refund' | 'signup';

export interface ICreditTransaction {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  type: CreditTransactionType;
  amount: number; // positive adds credits, negative removes credits
  balanceAfter: number;
  description: string;
  createdAt: Date;
}

export type CreditTransactionDocument = HydratedDocument<ICreditTransaction>;

const creditTransactionSchema = new Schema<ICreditTransaction>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['purchase', 'spend', 'refund', 'signup'], required: true },
    amount: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    description: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const CreditTransaction: Model<ICreditTransaction> = mongoose.model<ICreditTransaction>('CreditTransaction', creditTransactionSchema);
