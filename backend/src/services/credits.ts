import { ApiError } from '../utils/ApiError';
import { CreditTransaction, CreditTransactionType } from '../models/CreditTransaction';
import { User } from '../models/User';

export const CREDIT_COSTS = {
  text: Number(process.env.CREDITS_TEXT_COST ?? 1),
  image: Number(process.env.CREDITS_IMAGE_COST ?? 10),
  video: Number(process.env.CREDITS_VIDEO_COST ?? 50),
} as const;

export async function addCredits(userId: string, amount: number, type: CreditTransactionType = 'purchase', description = 'Credits added'): Promise<number> {
  const user = await User.findByIdAndUpdate(
    userId,
    { $inc: { credits: amount } },
    { new: true }
  );
  if (!user) {
    throw ApiError.notFound('User not found');
  }
  await CreditTransaction.create({
    userId,
    type,
    amount,
    balanceAfter: user.credits,
    description,
  });
  return user.credits;
}

export async function deductCredits(userId: string, amount: number, description: string): Promise<number> {
  if (amount < 0) {
    throw ApiError.badRequest('Credit deduction amount must be positive');
  }
  const user = await User.findOneAndUpdate(
    { _id: userId, credits: { $gte: amount } },
    { $inc: { credits: -amount } },
    { new: true }
  );
  if (!user) {
    throw ApiError.paymentRequired('Insufficient credits. Purchase more credits to continue.');
  }
  await CreditTransaction.create({
    userId,
    type: 'spend',
    amount: -amount,
    balanceAfter: user.credits,
    description,
  });
  return user.credits;
}
