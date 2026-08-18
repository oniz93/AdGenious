import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(5001),
  FRONTEND_URL: z.string().default('http://localhost:3000'),

  MONGODB_URI: z.string().default('mongodb://localhost:27017/adgenious'),

  JWT_SECRET: z.string().default('dev-only-secret-change-me'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  ENCRYPTION_KEY: z.string().default('dev-only-32-byte-encryption-key!'),

  SIGNUP_CREDITS: z.coerce.number().default(50),

  META_APP_ID: z.string().optional(),
  META_APP_SECRET: z.string().optional(),
  META_API_VERSION: z.string().default('v19.0'),
  META_REDIRECT_URI: z.string().default('http://localhost:5001/api/auth/facebook/callback'),

  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_TEXT_MODEL: z.string().default('openai/gpt-4o-mini'),
  OPENROUTER_IMAGE_MODEL: z.string().default('openai/dall-e-3'),

  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  CREDITS_TEXT_COST: z.coerce.number().default(1),
  CREDITS_IMAGE_COST: z.coerce.number().default(10),
  CREDITS_VIDEO_COST: z.coerce.number().default(50),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
