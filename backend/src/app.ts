import express, { Express } from 'express';
import cors from 'cors';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/error';
import { logger } from './utils/logger';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import aiRoutes from './routes/ai';
import metaRoutes from './routes/meta';
import { billingRouter, stripeWebhookRouter } from './routes/billing';

export function createApp(): Express {
  const app = express();

  app.use(cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  }));

  // Stripe webhook needs the raw body to verify signatures, so it is mounted
  // before the global JSON body parser.
  app.use('/api/billing/stripe-webhook', stripeWebhookRouter);

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.use((req, _res, next) => {
    logger.debug(`${req.method} ${req.originalUrl}`);
    next();
  });

  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'adgenious-backend',
      timestamp: new Date().toISOString(),
    });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/billing', billingRouter);
  app.use('/api/ai', aiRoutes);
  app.use('/api/meta', metaRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
