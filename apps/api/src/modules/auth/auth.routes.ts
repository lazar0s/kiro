import type { FastifyInstance } from 'fastify';
import { prisma } from '../../shared/database.js';
import { requireAuth, getAuthUser } from '../../shared/auth.js';
import { LoginBody, RefreshBody, type LoginResponse } from './auth.schemas.js';
import {
  authenticateCredentials,
  issueTokens,
  revokeAllTokens,
  rotateTokens,
  toPublicUser,
} from './auth.service.js';

/**
 * Auth routes.
 *
 *   POST /api/auth/login      email+password → access + refresh tokens
 *   POST /api/auth/refresh    refreshToken  → new access + refresh tokens (rotation)
 *   POST /api/auth/logout     bumps tokenVersion (invalidates all refresh tokens)
 *   GET  /api/auth/me         current user (access token required)
 *
 * The login response includes a `user` field so the dashboard can populate
 * its state without a follow-up round-trip.
 */
export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post('/api/auth/login', async (request, reply) => {
    const parsed = LoginBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Bad Request', issues: parsed.error.issues });
    }

    const user = await authenticateCredentials(parsed.data.email, parsed.data.password);
    if (!user) {
      return reply
        .status(401)
        .send({ error: 'Unauthorized', message: 'Invalid email or password' });
    }

    const tokens = await issueTokens(app, user);
    const response: LoginResponse = { ...tokens, user: toPublicUser(user) };
    return reply.send(response);
  });

  app.post('/api/auth/refresh', async (request, reply) => {
    const parsed = RefreshBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Bad Request', issues: parsed.error.issues });
    }

    const tokens = await rotateTokens(app, parsed.data.refreshToken);
    if (!tokens) {
      return reply
        .status(401)
        .send({ error: 'Unauthorized', message: 'Invalid or expired refresh token' });
    }
    return reply.send(tokens);
  });

  app.post(
    '/api/auth/logout',
    { preHandler: requireAuth },
    async (request, reply) => {
      const auth = getAuthUser(request);
      await revokeAllTokens(auth.sub);
      return reply.send({ ok: true });
    },
  );

  app.get(
    '/api/auth/me',
    { preHandler: requireAuth },
    async (request, reply) => {
      const auth = getAuthUser(request);
      const user = await prisma.user.findUnique({ where: { id: auth.sub } });
      if (!user || !user.isActive) {
        return reply.status(401).send({ error: 'Unauthorized', message: 'User no longer active' });
      }
      return reply.send(toPublicUser(user));
    },
  );
}
