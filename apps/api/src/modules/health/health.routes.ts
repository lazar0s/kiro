import type { FastifyInstance } from 'fastify';
import type { HealthResponse } from '@laundry/shared';
import { pingDatabase } from '../../shared/database.js';
import { pingRedis } from '../../shared/redis.js';

const startTime = Date.now();

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  /**
   * Simple liveness probe — returns 200 if the process is up, ignores deps.
   * Useful for container health checks that shouldn't flap on DB hiccups.
   */
  app.get('/api/health/live', async () => ({ ok: true }));

  /**
   * Readiness probe — returns 200 only if DB + Redis are reachable.
   * Use this one as the primary health endpoint.
   */
  app.get<{ Reply: HealthResponse }>('/api/health', async (_req, reply) => {
    const [dbOk, redisOk] = await Promise.all([pingDatabase(), pingRedis()]);
    const ok = dbOk && redisOk;

    const response: HealthResponse = {
      ok,
      service: 'laundry-api',
      version: '0.1.0',
      uptime: Math.round((Date.now() - startTime) / 1000),
      checks: {
        database: dbOk ? 'ok' : 'fail',
        redis: redisOk ? 'ok' : 'fail',
      },
    };

    return reply.status(ok ? 200 : 503).send(response);
  });
}
