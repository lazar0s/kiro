import type { Order, OrderEvent, Prisma } from '@prisma/client';
import {
  OrderStatus,
  UserRole,
  canRoleTransition,
  isValidTransition,
} from '@laundry/shared';
import { prisma } from '../../shared/database.js';
import { generateTrackingCode } from '../../shared/tracking-code.js';
import type {
  OrderDetail as OrderDetailDto,
  OrderSummary as OrderSummaryDto,
  OrderEvent as OrderEventDto,
  TrackingInfo,
} from '@laundry/shared';
import type { CreateOrderBody } from './orders.schemas.js';

const MAX_TRACKING_CODE_RETRIES = 5;

/**
 * Resolve the express surcharge for a given cleaning-type / speed combo.
 * Standard always returns 0. Missing config rows treat as "no surcharge" (best
 * behavior for a brand-new store that hasn't yet filled in pricing).
 */
export async function getExpressSurcharge(
  cleaningType: CreateOrderBody['cleaningType'],
  speed: CreateOrderBody['processingSpeed'],
): Promise<number> {
  if (speed === 'standard') return 0;
  const row = await prisma.pricing.findUnique({
    where: { cleaningType_processingSpeed: { cleaningType, processingSpeed: speed } },
  });
  return Number(row?.surcharge ?? 0);
}

/**
 * Create an order + its initial "received" event atomically.
 * Retries tracking-code collisions a few times before giving up; at 50 bits
 * of entropy a real collision is effectively impossible, so a collision here
 * almost certainly means something is wrong with the random source.
 */
export async function createOrder(body: CreateOrderBody): Promise<Order> {
  const surcharge = await getExpressSurcharge(body.cleaningType, body.processingSpeed);

  for (let attempt = 0; attempt < MAX_TRACKING_CODE_RETRIES; attempt++) {
    const trackingCode = generateTrackingCode();
    try {
      return await prisma.$transaction(async (tx) => {
        const order = await tx.order.create({
          data: {
            trackingCode,
            customerName: body.customerName,
            customerPhone: body.customerPhone,
            customerEmail: body.customerEmail ?? null,
            cleaningType: body.cleaningType,
            processingSpeed: body.processingSpeed,
            fulfillment: body.fulfillment,
            pickupLocationId: body.pickupLocationId ?? null,
            deliveryAddress: body.deliveryAddress ?? null,
            deliveryLat: body.deliveryLat ?? null,
            deliveryLng: body.deliveryLng ?? null,
            notes: body.notes ?? null,
            locationId: body.locationId,
            expressSurcharge: surcharge,
            // status defaults to "received"
          },
        });

        await tx.orderEvent.create({
          data: {
            orderId: order.id,
            fromStatus: null,
            toStatus: OrderStatus.Received,
            changedById: null, // customer or widget — no authenticated user
            metadata: { source: 'widget_or_staff_create' },
          },
        });

        return order;
      });
    } catch (err) {
      if (isPrismaUniqueConflict(err, 'tracking_code')) {
        continue; // try a new code
      }
      throw err;
    }
  }
  throw new Error('Failed to generate a unique tracking code after multiple attempts');
}

export interface ListOrdersOptions {
  status?: OrderStatus;
  locationId?: string;
  fulfillment?: CreateOrderBody['fulfillment'];
  search?: string;
  limit: number;
  cursor?: string;
  sort: 'createdAt:desc' | 'createdAt:asc' | 'updatedAt:desc';
}

export async function listOrders(opts: ListOrdersOptions): Promise<{
  items: OrderSummaryDto[];
  nextCursor: string | null;
}> {
  const where: Prisma.OrderWhereInput = {
    ...(opts.status ? { status: opts.status } : {}),
    ...(opts.locationId ? { locationId: opts.locationId } : {}),
    ...(opts.fulfillment ? { fulfillment: opts.fulfillment } : {}),
    ...(opts.search
      ? {
          OR: [
            { customerName: { contains: opts.search, mode: 'insensitive' } },
            { customerPhone: { contains: opts.search } },
            { trackingCode: { equals: opts.search.toUpperCase() } },
          ],
        }
      : {}),
  };

  const [sortField, sortDir] = opts.sort.split(':') as [string, 'asc' | 'desc'];
  const orderBy = { [sortField]: sortDir } as Prisma.OrderOrderByWithRelationInput;

  // We fetch limit + 1 to know whether there is a next page.
  const rows = await prisma.order.findMany({
    where,
    orderBy,
    take: opts.limit + 1,
    ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
  });

  const hasMore = rows.length > opts.limit;
  const items = rows.slice(0, opts.limit).map(toSummaryDto);
  const nextCursor = hasMore ? items[items.length - 1]!.id : null;

  return { items, nextCursor };
}

export async function getOrderDetail(id: string): Promise<OrderDetailDto | null> {
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      events: { orderBy: { createdAt: 'asc' } },
    },
  });
  if (!order) return null;
  return toDetailDto(order);
}

/**
 * Advance an order to the next status. Returns the updated order + the newly
 * created event, or a typed error describing why the transition was refused.
 */
export type TransitionError =
  | { kind: 'not_found' }
  | { kind: 'invalid_transition'; from: OrderStatus; to: OrderStatus }
  | { kind: 'forbidden'; role: UserRole }
  | { kind: 'missing_machine' }
  | { kind: 'missing_driver' };

export async function transitionOrder(params: {
  orderId: string;
  toStatus: OrderStatus;
  actorId: string;
  actorRole: UserRole;
  machineId?: string;
  driverId?: string;
}): Promise<
  | { ok: true; order: Order; event: OrderEvent }
  | { ok: false; error: TransitionError }
> {
  const existing = await prisma.order.findUnique({ where: { id: params.orderId } });
  if (!existing) return { ok: false, error: { kind: 'not_found' } };

  const from = existing.status as OrderStatus;
  if (!isValidTransition(from, params.toStatus)) {
    return { ok: false, error: { kind: 'invalid_transition', from, to: params.toStatus } };
  }
  if (!canRoleTransition(from, params.toStatus, params.actorRole)) {
    return { ok: false, error: { kind: 'forbidden', role: params.actorRole } };
  }

  // Side-effect fields on specific transitions.
  const updateData: Prisma.OrderUpdateInput = { status: params.toStatus };

  if (params.toStatus === OrderStatus.Working) {
    if (!params.machineId && !existing.machineId) {
      return { ok: false, error: { kind: 'missing_machine' } };
    }
    if (params.machineId) {
      updateData.machine = { connect: { id: params.machineId } };
    }
    updateData.assignedStaff = { connect: { id: params.actorId } };
  }

  if (params.toStatus === OrderStatus.OutForDelivery) {
    if (!params.driverId && !existing.assignedDriverId) {
      return { ok: false, error: { kind: 'missing_driver' } };
    }
    if (params.driverId) {
      updateData.assignedDriver = { connect: { id: params.driverId } };
    }
  }

  const { order, event } = await prisma.$transaction(async (tx) => {
    const updated = await tx.order.update({ where: { id: params.orderId }, data: updateData });
    const evt = await tx.orderEvent.create({
      data: {
        orderId: updated.id,
        fromStatus: from,
        toStatus: params.toStatus,
        changedById: params.actorId,
      },
    });
    return { order: updated, event: evt };
  });

  return { ok: true, order, event };
}

/**
 * Public tracking info — intentionally minimal: no phone, no address, no PII
 * beyond the customer's first name. The tracking code itself acts as the
 * bearer credential.
 */
export async function getTrackingInfo(code: string): Promise<TrackingInfo | null> {
  const order = await prisma.order.findUnique({
    where: { trackingCode: code },
    include: { events: { orderBy: { createdAt: 'asc' } } },
  });
  if (!order) return null;

  const firstName = order.customerName.trim().split(/\s+/)[0] ?? order.customerName;

  return {
    trackingCode: order.trackingCode,
    customerFirstName: firstName,
    status: order.status as OrderStatus,
    cleaningType: order.cleaningType,
    fulfillment: order.fulfillment,
    events: order.events.map((e) => ({
      status: e.toStatus as OrderStatus,
      at: e.createdAt.toISOString(),
    })),
  };
}

// ----------------------------------------------------------------------------
// Mappers
// ----------------------------------------------------------------------------

function toSummaryDto(o: Order): OrderSummaryDto {
  return {
    id: o.id,
    trackingCode: o.trackingCode,
    customerName: o.customerName,
    customerPhone: o.customerPhone,
    cleaningType: o.cleaningType,
    processingSpeed: o.processingSpeed,
    fulfillment: o.fulfillment,
    status: o.status as OrderStatus,
    locationId: o.locationId,
    machineId: o.machineId,
    assignedStaffId: o.assignedStaffId,
    assignedDriverId: o.assignedDriverId,
    expressSurcharge: Number(o.expressSurcharge),
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
  };
}

function toDetailDto(o: Order & { events: OrderEvent[] }): OrderDetailDto {
  const summary = toSummaryDto(o);
  return {
    ...summary,
    customerEmail: o.customerEmail,
    pickupLocationId: o.pickupLocationId,
    deliveryAddress: o.deliveryAddress,
    deliveryLat: o.deliveryLat ? Number(o.deliveryLat) : null,
    deliveryLng: o.deliveryLng ? Number(o.deliveryLng) : null,
    notes: o.notes,
    events: o.events.map(
      (e): OrderEventDto => ({
        id: e.id,
        orderId: e.orderId,
        fromStatus: (e.fromStatus as OrderStatus | null) ?? null,
        toStatus: e.toStatus as OrderStatus,
        changedById: e.changedById,
        createdAt: e.createdAt.toISOString(),
      }),
    ),
  };
}

function isPrismaUniqueConflict(err: unknown, field: string): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: string }).code === 'P2002' &&
    'meta' in err &&
    Array.isArray((err as { meta?: { target?: string[] } }).meta?.target) &&
    (err as { meta: { target: string[] } }).meta.target.includes(field)
  );
}
