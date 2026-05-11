import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import sensible from '@fastify/sensible';
import { corsAllowedOrigins, env } from './config/env.js';
import { logger } from './shared/logger.js';
import { healthRoutes } from './modules/health/health.routes.js';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    loggerInstance: logger,
    disableRequestLogging: env.NODE_ENV === 'production',
    bodyLimit: 1024 * 1024, // 1 MB; widget POSTs are tiny
    trustProxy: true,
  });

  await app.register(helmet, {
    // We'll tighten CSP when the web app is served from the API process.
    // For now, this is API-only, so relaxed defaults are fine.
    contentSecurityPolicy: false,
  });

  await app.register(cors, {
    origin: (origin, cb) => {
      // Allow same-origin / server-to-server calls (no origin header).
      if (!origin) return cb(null, true);
      if (corsAllowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error(`Origin ${origin} not allowed by CORS`), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
  });

  await app.register(sensible);

  // --- Routes ---
  await app.register(healthRoutes);

  // Catch-all for unknown routes — return a clean 404 with JSON.
  app.setNotFoundHandler((req, reply) => {
    reply.status(404).send({
      error: 'Not Found',
      message: `No route for ${req.method} ${req.url}`,
    });
  });

  return app;
}
