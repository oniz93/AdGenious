import mongoose, { HydratedDocument, Model, Schema } from 'mongoose';

export type AdSetStatus = 'draft' | 'ready' | 'launching' | 'active' | 'paused' | 'error' | 'archived';

export interface IAdSet {
  _id: mongoose.Types.ObjectId;
  campaignId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  name: string;
  status: AdSetStatus;
  targeting: Record<string, unknown>;
  optimizationGoal: string;
  billingEvent: string;
  dailyBudgetCents?: number;
  lifetimeBudgetCents?: number;
  startTime?: string;
  endTime?: string;
  reachEstimate?: number;
  subAudienceIndex?: number;
  metaAdSetId?: string;
  metaError?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type AdSetDocument = HydratedDocument<IAdSet>;

const adSetSchema = new Schema<IAdSet>(
  {
    campaignId: { type: Schema.Types.ObjectId, ref: 'Campaign', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    status: {
      type: String,
      enum: ['draft', 'ready', 'launching', 'active', 'paused', 'error', 'archived'],
      default: 'draft',
    },
    targeting: { type: Schema.Types.Mixed, default: {} },
    optimizationGoal: { type: String, default: 'LINK_CLICKS' },
    billingEvent: { type: String, default: 'IMPRESSIONS' },
    dailyBudgetCents: { type: Number },
    lifetimeBudgetCents: { type: Number },
    startTime: { type: String },
    endTime: { type: String },
    reachEstimate: { type: Number },
    subAudienceIndex: { type: Number },
    metaAdSetId: { type: String },
    metaError: { type: String },
  },
  { timestamps: true }
);

export const AdSet: Model<IAdSet> = mongoose.model<IAdSet>('AdSet', adSetSchema);
