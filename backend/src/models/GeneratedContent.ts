import mongoose, { HydratedDocument, Model, Schema } from 'mongoose';

export type GeneratedContentType = 'text' | 'image' | 'video';

export interface IGeneratedContent {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  campaignId?: mongoose.Types.ObjectId;
  contentType: GeneratedContentType;
  data: Record<string, unknown>;
  openrouterRequestId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type GeneratedContentDocument = HydratedDocument<IGeneratedContent>;

const generatedContentSchema = new Schema<IGeneratedContent>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    campaignId: { type: Schema.Types.ObjectId, ref: 'Campaign', index: true },
    contentType: { type: String, enum: ['text', 'image', 'video'], required: true },
    data: { type: Schema.Types.Mixed, default: {} },
    openrouterRequestId: { type: String },
  },
  { timestamps: true }
);

export const GeneratedContent: Model<IGeneratedContent> = mongoose.model<IGeneratedContent>('GeneratedContent', generatedContentSchema);
