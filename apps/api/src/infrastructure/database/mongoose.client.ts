import mongoose from 'mongoose';
import { logger } from '../../shared/logger/logger';

let isConnected = false;

export async function connectDatabase(uri: string): Promise<void> {
  if (isConnected) return;

  mongoose.set('strictQuery', true);

  mongoose.connection.on('connected', () => {
    logger.info('MongoDB connected');
    isConnected = true;
  });

  mongoose.connection.on('error', (err) => {
    logger.error('MongoDB error', { err });
    isConnected = false;
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
    isConnected = false;
  });

  await mongoose.connect(uri, {
    dbName: 'buildx',
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });
}

export async function disconnectDatabase(): Promise<void> {
  if (!isConnected) return;
  await mongoose.disconnect();
  isConnected = false;
  logger.info('MongoDB disconnected cleanly');
}

export { mongoose };
