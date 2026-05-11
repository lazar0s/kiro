/**
 * Domain enums shared between API, web dashboard, and customer widget.
 *
 * These mirror the Prisma schema enums in apps/api/prisma/schema.prisma.
 * If you change one, change the other.
 */

export const OrderStatus = {
  Received: 'received',
  NotStarted: 'not_started',
  Working: 'working',
  Finished: 'finished',
  OutForDelivery: 'out_for_delivery',
  Delivered: 'delivered',
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const UserRole = {
  Admin: 'admin',
  Staff: 'staff',
  Delivery: 'delivery',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const CleaningType = {
  WashFold: 'wash_fold',
  DryCleaning: 'dry_cleaning',
  Ironing: 'ironing',
  Special: 'special',
} as const;
export type CleaningType = (typeof CleaningType)[keyof typeof CleaningType];

export const ProcessingSpeed = {
  Standard: 'standard',
  Express: 'express',
} as const;
export type ProcessingSpeed = (typeof ProcessingSpeed)[keyof typeof ProcessingSpeed];

export const Fulfillment = {
  Pickup: 'pickup',
  Delivery: 'delivery',
} as const;
export type Fulfillment = (typeof Fulfillment)[keyof typeof Fulfillment];

export const MachineType = {
  Washer: 'washer',
  Dryer: 'dryer',
  Ironer: 'ironer',
} as const;
export type MachineType = (typeof MachineType)[keyof typeof MachineType];

export const NotificationChannel = {
  WhatsApp: 'whatsapp',
  Email: 'email',
  Viber: 'viber',
  InApp: 'in_app',
} as const;
export type NotificationChannel =
  (typeof NotificationChannel)[keyof typeof NotificationChannel];

export const NotificationStatus = {
  Pending: 'pending',
  Sent: 'sent',
  Failed: 'failed',
  Delivered: 'delivered',
} as const;
export type NotificationStatus =
  (typeof NotificationStatus)[keyof typeof NotificationStatus];

export const AlertTrigger = {
  NewOrder: 'new_order',
  PendingTimeout: 'pending_timeout',
  MachineError: 'machine_error',
  DeliveryDelay: 'delivery_delay',
} as const;
export type AlertTrigger = (typeof AlertTrigger)[keyof typeof AlertTrigger];

/** Ordered list of order statuses for progress display. */
export const ORDER_STATUS_FLOW: readonly OrderStatus[] = [
  OrderStatus.Received,
  OrderStatus.NotStarted,
  OrderStatus.Working,
  OrderStatus.Finished,
  OrderStatus.OutForDelivery,
  OrderStatus.Delivered,
] as const;

/** Human-readable labels for UI display. */
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  [OrderStatus.Received]: 'Order received',
  [OrderStatus.NotStarted]: 'Not started',
  [OrderStatus.Working]: 'Working on it',
  [OrderStatus.Finished]: 'Finished',
  [OrderStatus.OutForDelivery]: 'Out for delivery',
  [OrderStatus.Delivered]: 'Delivered',
};

export const CLEANING_TYPE_LABELS: Record<CleaningType, string> = {
  [CleaningType.WashFold]: 'Wash & Fold',
  [CleaningType.DryCleaning]: 'Dry Cleaning',
  [CleaningType.Ironing]: 'Ironing',
  [CleaningType.Special]: 'Special Items',
};
