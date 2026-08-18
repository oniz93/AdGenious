import express, { Request, Router } from 'express';
import { z } from 'zod';
import { Purchase } from '../models/Purchase';
import { CreditTransaction } from '../models/CreditTransaction';
import { AuthedRequest, requireAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import { CREDIT_PACKAGES, createCheckoutSession, verifyAndHandleWebhook } from '../services/stripe';

export const billingRouter = Router();

billingRouter.get(
  '/packages',
  asyncHandler(async (_req, res) => {
    res.json({
      success: true,
      packages: CREDIT_PACKAGES.map((pkg) => ({
        id: pkg.id,
        name: pkg.name,
        credits: pkg.credits,
        description: pkg.description,
        price: { amountCents: pkg.priceCents, currency: 'usd' },
      })),
    });
  })
);

const createCheckoutSchema = z.object({
  packageId: z.string().min(1),
});

billingRouter.post(
  '/create-checkout-session',
  requireAuth,
  validateBody(createCheckoutSchema),
  asyncHandler(async (req, res) => {
    const { user } = req as AuthedRequest;
    const { packageId } = req.body as z.infer<typeof createCheckoutSchema>;
    const session = await createCheckoutSession(String(user!._id), user!.email, packageId);
    res.json({ success: true, ...session });
  })
);

billingRouter.get(
  '/history',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { user } = req as AuthedRequest;
    const transactions = await CreditTransaction.find({ userId: user!._id }).sort({ createdAt: -1 }).limit(100);
    const purchases = await Purchase.find({ userId: user!._id }).sort({ createdAt: -1 }).limit(100);

    res.json({
      success: true,
      transactions: transactions.map((t) => ({
        id: String(t._id),
        type: t.type,
        amount: t.amount,
        balanceAfter: t.balanceAfter,
        description: t.description,
        createdAt: t.createdAt,
      })),
      purchases: purchases.map((p) => ({
        id: String(p._id),
        packageId: p.packageId,
        credits: p.credits,
        amountCents: p.amountCents,
        status: p.status,
        createdAt: p.createdAt,
      })),
    });
  })
);

export const stripeWebhookRouter = Router();

stripeWebhookRouter.post(
  '/',
  express.raw({ type: 'application/json' }),
  asyncHandler(async (req: Request, res) => {
    const signature = req.headers['stripe-signature'];
    if (!signature || Array.isArray(signature)) {
      res.status(400).json({ success: false, error: { message: 'Missing stripe-signature header' } });
      return;
    }
    await verifyAndHandleWebhook(req.body as Buffer, signature);
    res.json({ received: true });
  })
);
