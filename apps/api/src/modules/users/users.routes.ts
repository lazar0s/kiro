import type { FastifyInstance } from 'fastify';
import { UserRole } from '@laundry/shared';
import { prisma } from '../../shared/database.js';
import { requireRole } from '../../shared/auth.js';
import { hashPassword } from '../../shared/passwords.js';
import {
  CreateUserBody,
  ListUsersQuery,
  UpdateUserBody,
  UserIdParams,
  type UserPublic,
} from './users.schemas.js';

/**
 * Admin-only user management.
 *
 *   GET    /api/admin/users          list, filter by role/isActive, search by name/email
 *   POST   /api/admin/users          create a staff/delivery/admin user
 *   PATCH  /api/admin/users/:id      update name/role/location/isActive/password
 *   DELETE /api/admin/users/:id      soft delete (sets isActive=false + bumps tokenVersion)
 *
 * All four require admin role. We return a UserPublic shape that never
 * includes passwordHash or tokenVersion.
 */
export async function usersRoutes(app: FastifyInstance): Promise<void> {
  const adminOnly = { preHandler: requireRole(UserRole.Admin) };

  app.get('/api/admin/users', adminOnly, async (request, reply) => {
    const parsed = ListUsersQuery.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Bad Request', issues: parsed.error.issues });
    }
    const { role, isActive, search } = parsed.data;

    const users = await prisma.user.findMany({
      where: {
        ...(role ? { role } : {}),
        ...(typeof isActive === 'boolean' ? { isActive } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
    });

    return reply.send(users.map(toPublicUser));
  });

  app.post('/api/admin/users', adminOnly, async (request, reply) => {
    const parsed = CreateUserBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Bad Request', issues: parsed.error.issues });
    }
    const { email, name, role, password, phone, locationId } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return reply.status(409).send({ error: 'Conflict', message: 'Email already registered' });
    }

    const created = await prisma.user.create({
      data: {
        email,
        name,
        role,
        phone: phone ?? null,
        locationId: locationId ?? null,
        passwordHash: await hashPassword(password),
      },
    });

    return reply.status(201).send(toPublicUser(created));
  });

  app.patch('/api/admin/users/:id', adminOnly, async (request, reply) => {
    const params = UserIdParams.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send({ error: 'Bad Request', issues: params.error.issues });
    }
    const body = UpdateUserBody.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Bad Request', issues: body.error.issues });
    }

    const existing = await prisma.user.findUnique({ where: { id: params.data.id } });
    if (!existing) {
      return reply.status(404).send({ error: 'Not Found' });
    }

    const updated = await prisma.user.update({
      where: { id: params.data.id },
      data: {
        ...(body.data.name !== undefined ? { name: body.data.name } : {}),
        ...(body.data.role !== undefined ? { role: body.data.role } : {}),
        ...(body.data.phone !== undefined ? { phone: body.data.phone } : {}),
        ...(body.data.locationId !== undefined ? { locationId: body.data.locationId } : {}),
        ...(body.data.isActive !== undefined ? { isActive: body.data.isActive } : {}),
        ...(body.data.password
          ? {
              passwordHash: await hashPassword(body.data.password),
              // Changing password invalidates any existing refresh tokens.
              tokenVersion: { increment: 1 },
            }
          : {}),
      },
    });

    return reply.send(toPublicUser(updated));
  });

  app.delete('/api/admin/users/:id', adminOnly, async (request, reply) => {
    const params = UserIdParams.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send({ error: 'Bad Request', issues: params.error.issues });
    }

    const existing = await prisma.user.findUnique({ where: { id: params.data.id } });
    if (!existing) {
      return reply.status(404).send({ error: 'Not Found' });
    }

    // Soft delete: disable the account and invalidate outstanding tokens.
    await prisma.user.update({
      where: { id: params.data.id },
      data: { isActive: false, tokenVersion: { increment: 1 } },
    });

    return reply.status(204).send();
  });
}

function toPublicUser(u: {
  id: string;
  email: string;
  phone: string | null;
  name: string;
  role: string;
  locationId: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): UserPublic {
  return {
    id: u.id,
    email: u.email,
    phone: u.phone,
    name: u.name,
    role: u.role,
    locationId: u.locationId,
    isActive: u.isActive,
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
  };
}
