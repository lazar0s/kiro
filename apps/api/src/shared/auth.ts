import type { FastifyReply, FastifyRequest } from 'fastify';
import type { UserRole } from '@laundry/shared';
import { UserRole as Roles } from '@laundry/shared';
import type { AccessTokenPayload } from './jwt.js';

/**
 * Auth utilities used by route handlers.
 *
 * `requireAuth` verifies the JWT on the Authorization header and attaches the
 * access-token payload to `request.user` (the type comes from `@fastify/jwt`
 * module augmentation in `jwt-augment.d.ts`).
 *
 * `requireRole(...roles)` returns a preHandler that also enforces RBAC.
 * Admin is always allowed on top of the listed roles.
 */

export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  try {
    await request.jwtVerify();
  } catch {
    return reply.status(401).send({ error: 'Unauthorized', message: 'Invalid or missing token' });
  }

  const user = request.user as AccessTokenPayload;
  if (user.type !== 'access') {
    return reply
      .status(401)
      .send({ error: 'Unauthorized', message: 'Wrong token type' });
  }
}

export function requireRole(...allowed: UserRole[]) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    await requireAuth(request, reply);
    if (reply.sent) return;

    const user = request.user as AccessTokenPayload;
    if (user.role === Roles.Admin) return; // admin bypass
    if (!allowed.includes(user.role)) {
      return reply
        .status(403)
        .send({ error: 'Forbidden', message: 'Insufficient role' });
    }
  };
}

/** Helper to read the authenticated user from a request (typed). */
export function getAuthUser(request: FastifyRequest): AccessTokenPayload {
  return request.user as AccessTokenPayload;
}
