import { z } from 'zod';
import { CleaningType, Fulfillment, OrderStatus, ProcessingSpeed } from '@laundry/shared';

const CleaningTypeEnum = z.nativeEnum(CleaningType);
const ProcessingSpeedEnum = z.nativeEnum(ProcessingSpeed);
const FulfillmentEnum = z.nativeEnum(Fulfillment);
const OrderStatusEnum = z.nativeEnum(OrderStatus);

/**
 * Order creation body.
 *
 * `.superRefine` enforces the fulfillment branching:
 *   - pickup  → pickupLocationId required, delivery fields must be absent
 *   - delivery → deliveryAddress + lat/lng required, pickup field must be absent
 */
export const CreateOrderBody = z
  .object({
    customerName: z.string().min(1).max(100).trim(),
    customerPhone: z.string().min(5).max(20).trim(),
    customerEmail: z.string().email().max(255).optional(),
    cleaningType: CleaningTypeEnum,
    processingSpeed: ProcessingSpeedEnum.default(ProcessingSpeed.Standard),
    fulfillment: FulfillmentEnum,

    pickupLocationId: z.string().uuid().optional(),
    deliveryAddress: z.string().min(1).max(500).optional(),
    deliveryLat: z.number().min(-90).max(90).optional(),
    deliveryLng: z.number().min(-180).max(180).optional(),

    /** Processing location — required for now; Phase 10 auto-assigns by round-robin. */
    locationId: z.string().uuid(),
    notes: z.string().max(1000).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.fulfillment === Fulfillment.Pickup) {
      if (!val.pickupLocationId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['pickupLocationId'],
          message: 'pickupLocationId is required when fulfillment is "pickup"',
        });
      }
      if (val.deliveryAddress || val.deliveryLat !== undefined || val.deliveryLng !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['deliveryAddress'],
          message: 'Delivery fields must not be set when fulfillment is "pickup"',
        });
      }
    } else {
      // delivery
      if (!val.deliveryAddress) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['deliveryAddress'],
          message: 'deliveryAddress is required when fulfillment is "delivery"',
        });
      }
      if (val.deliveryLat === undefined || val.deliveryLng === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['deliveryLat'],
          message: 'deliveryLat and deliveryLng are required when fulfillment is "delivery"',
        });
      }
      if (val.pickupLocationId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['pickupLocationId'],
          message: 'pickupLocationId must not be set when fulfillment is "delivery"',
        });
      }
    }
  });
export type CreateOrderBody = z.infer<typeof CreateOrderBody>;

export const ListOrdersQuery = z.object({
  status: OrderStatusEnum.optional(),
  locationId: z.string().uuid().optional(),
  fulfillment: FulfillmentEnum.optional(),
  search: z.string().min(1).max(100).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  cursor: z.string().uuid().optional(),
  sort: z.enum(['createdAt:desc', 'createdAt:asc', 'updatedAt:desc']).default('createdAt:desc'),
});
export type ListOrdersQuery = z.infer<typeof ListOrdersQuery>;

export const OrderIdParams = z.object({
  id: z.string().uuid(),
});

export const UpdateOrderStatusBody = z.object({
  toStatus: OrderStatusEnum,
  /** Optional machine assignment when moving to "working". */
  machineId: z.string().uuid().optional(),
  /** Optional driver assignment when moving to "out_for_delivery". */
  driverId: z.string().uuid().optional(),
});
export type UpdateOrderStatusBody = z.infer<typeof UpdateOrderStatusBody>;

export const TrackingCodeParams = z.object({
  code: z
    .string()
    .min(6)
    .max(20)
    .regex(/^[A-Z0-9]+$/, 'Tracking code must be uppercase letters and digits'),
});
