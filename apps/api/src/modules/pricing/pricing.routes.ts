import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { CleaningType, ProcessingSpeed, UserRole } from '@laundry/shared';
import { requireRole } from '../../shared/auth.js';
import { prisma } from '../../shared/database.js';

/**
 * Admin-only pricing configuration.
 *
 *   GET  /api/admin/pricing    list all cleaning-type × speed rows
 *   PUT  /api/admin/pricing    bulk-update surcharges / base prices
 *
 * The seed installs a row for every (cleaning_type, processing_speed) pair,
 * so admins are always updating existing rows — we don't create new ones here.
 */

const UpdatePricingBody = z.object({
  items: z
    .array(
      z.object({
        cleaningType: z.nativeEnum(CleaningType),
        processingSpeed: z.nativeEnum(ProcessingSpeed),
        basePrice: z.number().nonnegative().optional(),
        surcharge: z.number().nonnegative().optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .min(1),
});

export async function pricingRoutes(app: FastifyInstance): Promise<void> {
  const adminOnly = { preHandler: requireRole(UserRole.Admin) };

  app.get('/api/admin/pricing', adminOnly, async (_request, reply) => {
    const rows = await prisma.pricing.findMany({
      orderBy: [{ cleaningType: 'asc' }, { processingSpeed: 'asc' }],
    });
    return reply.send(
      rows.map((r) => ({
        id: r.id,
        cleaningType: r.cleaningType,
        processingSpeed: r.processingSpeed,
        basePrice: r.basePrice ? Number(r.basePrice) : null,
        surcharge: Number(r.surcharge),
        isActive: r.isActive,
        updatedAt: r.updatedAt.toISOString(),
      })),
    );
  });

  app.put('/api/admin/pricing', adminOnly, async (request, reply) => {
    const parsed = UpdatePricingBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Bad Request', issues: parsed.error.issues });
    }

    await prisma.$transaction(
      parsed.data.items.map((item) =>
        prisma.pricing.update({
          where: {
            cleaningType_processingSpeed: {
              cleaningType: item.cleaningType,
              processingSpeed: item.processingSpeed,
            },
          },
          data: {
            ...(item.basePrice !== undefined ? { basePrice: item.basePrice } : {}),
            ...(item.surcharge !== undefined ? { surcharge: item.surcharge } : {}),
            ...(item.isActive !== undefined ? { isActive: item.isActive } : {}),
          },
        }),
      ),
    );

    return reply.send({ ok: true, updated: parsed.data.items.length });
  });
}
