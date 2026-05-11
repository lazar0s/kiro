import type { FastifyInstance } from 'fastify';
import { UserRole } from '@laundry/shared';
import { getAuthUser, requireRole } from '../../shared/auth.js';
import {
  CreateOrderBody,
  ListOrdersQuery,
  OrderIdParams,
  TrackingCodeParams,
  UpdateOrderStatusBody,
} from './orders.schemas.js';
import {
  createOrder,
  getOrderDetail,
  getTrackingInfo,
  listOrders,
  transitionOrder,
} from './orders.service.js';

/**
 * Order routes.
 *
 *   POST   /api/orders              public; widget + staff submit here
 *   GET    /api/orders              staff+; list with filters + cursor pagination
 *   GET    /api/orders/:id          staff+; full detail with events timeline
 *   PATCH  /api/orders/:id/status   staff or delivery (depending on transition)
 *   GET    /api/track/:code         public; customer-facing progress
 */
export async function ordersRoutes(app: FastifyInstance): Promise<void> {
  // ---- Public: create an order ------------------------------------------
  app.post('/api/orders', async (request, reply) => {
    const parsed = CreateOrderBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Bad Request', issues: parsed.error.issues });
    }
    const order = await createOrder(parsed.data);
    return reply.status(201).send({
      id: order.id,
      trackingCode: order.trackingCode,
      status: order.status,
      expressSurcharge: Number(order.expressSurcharge),
      // We only expose the tracking info a customer needs to follow along.
      trackingUrl: `/track/${order.trackingCode}`,
    });
  });

  // ---- Staff+: list orders ----------------------------------------------
  app.get(
    '/api/orders',
    { preHandler: requireRole(UserRole.Staff, UserRole.Delivery) },
    async (request, reply) => {
      const parsed = ListOrdersQuery.safeParse(request.query);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'Bad Request', issues: parsed.error.issues });
      }
      const result = await listOrders(parsed.data);
      return reply.send(result);
    },
  );

  // ---- Staff+: order detail ---------------------------------------------
  app.get(
    '/api/orders/:id',
    { preHandler: requireRole(UserRole.Staff, UserRole.Delivery) },
    async (request, reply) => {
      const params = OrderIdParams.safeParse(request.params);
      if (!params.success) {
        return reply.status(400).send({ error: 'Bad Request', issues: params.error.issues });
      }
      const order = await getOrderDetail(params.data.id);
      if (!order) return reply.status(404).send({ error: 'Not Found' });
      return reply.send(order);
    },
  );

  // ---- Staff or Delivery: advance status --------------------------------
  app.patch(
    '/api/orders/:id/status',
    { preHandler: requireRole(UserRole.Staff, UserRole.Delivery) },
    async (request, reply) => {
      const params = OrderIdParams.safeParse(request.params);
      if (!params.success) {
        return reply.status(400).send({ error: 'Bad Request', issues: params.error.issues });
      }
      const body = UpdateOrderStatusBody.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send({ error: 'Bad Request', issues: body.error.issues });
      }
      const auth = getAuthUser(request);

      const result = await transitionOrder({
        orderId: params.data.id,
        toStatus: body.data.toStatus,
        actorId: auth.sub,
        actorRole: auth.role,
        machineId: body.data.machineId,
        driverId: body.data.driverId,
      });

      if (!result.ok) {
        switch (result.error.kind) {
          case 'not_found':
            return reply.status(404).send({ error: 'Not Found' });
          case 'invalid_transition':
            return reply.status(409).send({
              error: 'Conflict',
              message: `Cannot transition from ${result.error.from} to ${result.error.to}`,
            });
          case 'forbidden':
            return reply.status(403).send({
              error: 'Forbidden',
              message: `Role "${result.error.role}" cannot perform this transition`,
            });
          case 'missing_machine':
            return reply.status(400).send({
              error: 'Bad Request',
              message: 'machineId is required when moving an order to "working"',
            });
          case 'missing_driver':
            return reply.status(400).send({
              error: 'Bad Request',
              message: 'driverId is required when moving an order to "out_for_delivery"',
            });
        }
      }

      return reply.send({
        id: result.order.id,
        status: result.order.status,
        eventId: result.event.id,
      });
    },
  );

  // ---- Public: customer tracking ----------------------------------------
  app.get('/api/track/:code', async (request, reply) => {
    const params = TrackingCodeParams.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send({ error: 'Bad Request', issues: params.error.issues });
    }
    const info = await getTrackingInfo(params.data.code);
    if (!info) return reply.status(404).send({ error: 'Not Found' });
    return reply.send(info);
  });
}
