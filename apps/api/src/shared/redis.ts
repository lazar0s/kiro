import IORedis from 'ioredis';
import { env } from '../config/env.js';
import { logger } from './logger.js';

/**
 * Shared Redis connection.
 * BullMQ and Socket.IO adapter will each get their own connections later
 * (they need to own the connection for blocking commands / pub-sub).
 */
export const redis = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  lazyConnect: false,
});

redis.on('error', (err) => {
  logger.error({ err }, 'Redis connection error');
});

redis.on('connect', () => {
  logger.debug('Redis connected');
});

export async function pingRedis(): Promise<boolean> {
  try {
    const res = await redis.ping();
    return res === 'PONG';
  } catch (err) {
    logger.error({ err }, 'Redis ping failed');
    return false;
  }
}

export async function disconnectRedis(): Promise<void> {
  await redis.quit();
}
