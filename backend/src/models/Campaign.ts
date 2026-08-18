import mongoose, { HydratedDocument, Model, Schema } from 'mongoose';

export type CampaignStatus = 'draft' | 'ready' | 'launching' | 'active' | 'paused' | 'error' | 'archived';

export type CampaignObjective =
  | 'OUTCOME_AWARENESS'
  | 'OUTCOME_TRAFFIC'
  | 'OUTCOME_ENGAGEMENT'
  | 'OUTCOME_LEADS'
  | 'OUTCOME_SALES'
  | 'OUTCOME_APP_PROMOTION';

export interface ICampaign {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  name: string;
  objective: CampaignObjective;
  status: CampaignStatus;
  buyingType: string;
  metaCampaignId?: string;
  dailyBudgetCents?: number;
  lifetimeBudgetCents?: number;
  startTime?: string;
  endTime?: string;
  metaError?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type CampaignDocument = HydratedDocument<ICampaign>;

const campaignSchema = new Schema<ICampaign>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    objective: {
      type: String,
      enum: ['OUTCOME_AWARENESS', 'OUTCOME_TRAFFIC', 'OUTCOME_ENGAGEMENT', 'OUTCOME_LEADS', 'OUTCOME_SALES', 'OUTCOME_APP_PROMOTION'],
      required: true,
    },
    status: {
      type: String,
      enum: ['draft', 'ready', 'launching', 'active', 'paused', 'error', 'archived'],
      default: 'draft',
      index: true,
    },
    buyingType: { type: String, default: 'AUCTION' },
    metaCampaignId: { type: String },
    dailyBudgetCents: { type: Number },
    lifetimeBudgetCents: { type: Number },
    startTime: { type: String },
    endTime: { type: String },
    metaError: { type: String },
  },
  { timestamps: true }
);

export const Campaign: Model<ICampaign> = mongoose.model<ICampaign>('Campaign', campaignSchema);
