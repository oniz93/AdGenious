import mongoose, { HydratedDocument, Model, Schema } from 'mongoose';

export type AdStatus = 'draft' | 'ready' | 'launching' | 'active' | 'paused' | 'error' | 'archived';

export interface AdCreative {
  message: string;
  headline?: string;
  description?: string;
  linkUrl: string;
  callToAction?: string;
  imageUrl?: string;
  imageHash?: string;
  pageId?: string;
}

export interface IAd {
  _id: mongoose.Types.ObjectId;
  adSetId: mongoose.Types.ObjectId;
  campaignId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  name: string;
  status: AdStatus;
  creative: AdCreative;
  metaAdId?: string;
  metaCreativeId?: string;
  metaError?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type AdDocument = HydratedDocument<IAd>;

const adSchema = new Schema<IAd>(
  {
    adSetId: { type: Schema.Types.ObjectId, ref: 'AdSet', required: true, index: true },
    campaignId: { type: Schema.Types.ObjectId, ref: 'Campaign', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    status: {
      type: String,
      enum: ['draft', 'ready', 'launching', 'active', 'paused', 'error', 'archived'],
      default: 'draft',
    },
    creative: { type: Schema.Types.Mixed, default: {} },
    metaAdId: { type: String },
    metaCreativeId: { type: String },
    metaError: { type: String },
  },
  { timestamps: true }
);

export const Ad: Model<IAd> = mongoose.model<IAd>('Ad', adSchema);
