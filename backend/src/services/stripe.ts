import Stripe from 'stripe';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';
import { logger } from '../utils/logger';
import { Purchase } from '../models/Purchase';
import { addCredits } from './credits';

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  priceCents: number;
  description: string;
}

export const CREDIT_PACKAGES: CreditPackage[] = [
  { id: 'starter', name: 'Starter', credits: 100, priceCents: 1000, description: 'Perfect for testing AI-generated ads' },
  { id: 'growth', name: 'Growth', credits: 500, priceCents: 4000, description: 'For growing businesses running regular campaigns' },
  { id: 'scale', name: 'Scale', credits: 1500, priceCents: 10000, description: 'For agencies and high-volume advertisers' },
];

function getStripe(): Stripe {
  if (!env.STRIPE_SECRET_KEY) {
    throw ApiError.badRequest('Stripe is not configured. Set STRIPE_SECRET_KEY.');
  }
  return new Stripe(env.STRIPE_SECRET_KEY);
}

export function findPackage(packageId: string): CreditPackage {
  const pkg = CREDIT_PACKAGES.find((p) => p.id === packageId);
  if (!pkg) {
    throw ApiError.notFound('Unknown credit package');
  }
  return pkg;
}

export async function createCheckoutSession(userId: string, email: string, packageId: string): Promise<{ sessionId: string; url: string | null }> {
  const stripe = getStripe();
  const pkg = findPackage(packageId);

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: email,
    success_url: `${env.FRONTEND_URL}/settings?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.FRONTEND_URL}/settings?checkout=cancelled`,
    client_reference_id: userId,
    metadata: {
      userId,
      packageId,
      credits: String(pkg.credits),
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: pkg.priceCents,
          product_data: {
            name: `AdGenious ${pkg.name} Credits`,
            description: pkg.description,
          },
        },
      },
    ],
  });

  await Purchase.create({
    userId,
    stripeSessionId: session.id,
    packageId,
    credits: pkg.credits,
    amountCents: pkg.priceCents,
    currency: 'usd',
    status: 'pending',
  });

  return { sessionId: session.id, url: session.url };
}

export async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const metadata = session.metadata ?? {};
  const userId = metadata.userId;
  const packageId = metadata.packageId;
  const credits = Number(metadata.credits ?? 0);

  if (!userId || !credits) {
    logger.warn('Checkout session completed without valid metadata', { sessionId: session.id });
    return;
  }

  const existing = await Purchase.findOne({ stripeSessionId: session.id });
  if (existing?.status === 'completed') {
    logger.info('Checkout session already processed', { sessionId: session.id });
    return;
  }

  await addCredits(userId, credits, 'purchase', `Purchased ${credits} credits (${packageId})`);
  await Purchase.findOneAndUpdate(
    { stripeSessionId: session.id },
    { status: 'completed' },
    { upsert: true, new: true }
  );
  logger.info('Credits added after checkout', { userId, credits, sessionId: session.id });
}

export async function verifyAndHandleWebhook(payload: Buffer, signature: string): Promise<void> {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    throw ApiError.badRequest('Stripe webhook is not configured. Set STRIPE_WEBHOOK_SECRET.');
  }
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid webhook signature';
    throw ApiError.badRequest(`Webhook signature verification failed: ${message}`);
  }

  if (event.type === 'checkout.session.completed') {
    await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
  }
}
