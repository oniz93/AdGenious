import mongoose, { HydratedDocument, Model, Schema } from 'mongoose';

export interface IPerformanceStats {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  campaignId: mongoose.Types.ObjectId;
  adSetId: mongoose.Types.ObjectId;
  adId: mongoose.Types.ObjectId;
  date: string; // YYYY-MM-DD
  impressions: number;
  clicks: number;
  spendCents: number;
  cpc?: number;
  ctr?: number;
  cpm?: number;
  reach?: number;
  frequency?: number;
  actions?: Record<string, unknown>;
  costPerActionType?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export type PerformanceStatsDocument = HydratedDocument<IPerformanceStats>;

const performanceStatsSchema = new Schema<IPerformanceStats>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    campaignId: { type: Schema.Types.ObjectId, ref: 'Campaign', required: true, index: true },
    adSetId: { type: Schema.Types.ObjectId, ref: 'AdSet', required: true, index: true },
    adId: { type: Schema.Types.ObjectId, ref: 'Ad', required: true, index: true },
    date: { type: String, required: true },
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    spendCents: { type: Number, default: 0 },
    cpc: { type: Number },
    ctr: { type: Number },
    cpm: { type: Number },
    reach: { type: Number },
    frequency: { type: Number },
    actions: { type: Schema.Types.Mixed },
    costPerActionType: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

performanceStatsSchema.index({ adId: 1, date: 1 }, { unique: true });

export const PerformanceStats: Model<IPerformanceStats> = mongoose.model<IPerformanceStats>('PerformanceStats', performanceStatsSchema);
