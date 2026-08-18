import { createApp } from './app';
import { env } from './config/env';
import { connectToDatabase } from './db/connection';
import { logger } from './utils/logger';
import { startSchedulers } from './services/scheduler';

async function bootstrap() {
  try {
    await connectToDatabase();
  } catch (error) {
    logger.error('Failed to connect to MongoDB. Start MongoDB (docker compose up -d mongo) or check MONGODB_URI.', { error });
    process.exit(1);
  }

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(`AdGenious backend listening on port ${env.PORT}`, { env: env.NODE_ENV });
    startSchedulers();
  });

  const shutdown = (signal: string) => {
    logger.info(`${signal} received, shutting down gracefully`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

void bootstrap();
