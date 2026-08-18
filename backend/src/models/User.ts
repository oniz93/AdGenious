import mongoose, { HydratedDocument, Model, Schema } from 'mongoose';

export interface IUser {
  _id: mongoose.Types.ObjectId;
  email: string;
  hashedPassword?: string;
  name?: string;
  facebookId?: string;
  facebookAccessTokenEnc?: string;
  facebookAccessTokenExpiresAt?: Date;
  stripeCustomerId?: string;
  credits: number;
  selectedAdAccountId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type UserDocument = HydratedDocument<IUser>;

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    hashedPassword: { type: String },
    name: { type: String, trim: true },
    facebookId: { type: String, unique: true, sparse: true },
    facebookAccessTokenEnc: { type: String, select: false },
    facebookAccessTokenExpiresAt: { type: Date },
    stripeCustomerId: { type: String },
    credits: { type: Number, default: 0, min: 0 },
    selectedAdAccountId: { type: String },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        ret.id = String(ret._id);
        delete ret._id;
        delete ret.__v;
        delete ret.hashedPassword;
        delete ret.facebookAccessTokenEnc;
        return ret;
      },
    },
  }
);

export const User: Model<IUser> = mongoose.model<IUser>('User', userSchema);
