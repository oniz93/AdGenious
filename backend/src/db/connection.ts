import mongoose from 'mongoose';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export async function connectToDatabase(): Promise<void> {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.MONGODB_URI);
  logger.info('Connected to MongoDB', { uri: env.MONGODB_URI.replace(/\/\/.*@/, '//***@') });
}

export async function disconnectFromDatabase(): Promise<void> {
  await mongoose.disconnect();
}
