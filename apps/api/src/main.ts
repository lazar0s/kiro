import { buildApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './shared/logger.js';
import { disconnectDatabase } from './shared/database.js';
import { disconnectRedis } from './shared/redis.js';

async function start(): Promise<void> {
  const app = await buildApp();

  try {
    await app.listen({ port: env.API_PORT, host: '0.0.0.0' });
    logger.info(`API listening on http://localhost:${env.API_PORT}`);
  } catch (err) {
    logger.error({ err }, 'Failed to start server');
    process.exit(1);
  }

  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`Received ${signal}, shutting down`);
    try {
      await app.close();
      await disconnectDatabase();
      await disconnectRedis();
      process.exit(0);
    } catch (err) {
      logger.error({ err }, 'Error during shutdown');
      process.exit(1);
    }
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

void start();
