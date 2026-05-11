import type {
  CleaningType,
  Fulfillment,
  OrderStatus,
  ProcessingSpeed,
} from './enums.js';

/**
 * DTOs for the order creation endpoint.
 * The widget and staff dashboard both POST this shape to /api/orders.
 */
export interface CreateOrderInput {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  cleaningType: CleaningType;
  processingSpeed: ProcessingSpeed;
  fulfillment: Fulfillment;
  /** Required when fulfillment === 'pickup'. UUID of a location. */
  pickupLocationId?: string;
  /** Required when fulfillment === 'delivery'. */
  deliveryAddress?: string;
  deliveryLat?: number;
  deliveryLng?: number;
  /** Processing location (which store handles the order). */
  locationId: string;
  notes?: string;
}

export interface OrderSummary {
  id: string;
  trackingCode: string;
  customerName: string;
  customerPhone: string;
  cleaningType: CleaningType;
  processingSpeed: ProcessingSpeed;
  fulfillment: Fulfillment;
  status: OrderStatus;
  locationId: string;
  machineId: string | null;
  assignedStaffId: string | null;
  assignedDriverId: string | null;
  expressSurcharge: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrderEvent {
  id: string;
  orderId: string;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  changedById: string | null;
  createdAt: string;
}

export interface OrderDetail extends OrderSummary {
  customerEmail: string | null;
  pickupLocationId: string | null;
  deliveryAddress: string | null;
  deliveryLat: number | null;
  deliveryLng: number | null;
  notes: string | null;
  events: OrderEvent[];
}

/** Public tracking-page response (no PII beyond first name). */
export interface TrackingInfo {
  trackingCode: string;
  customerFirstName: string;
  status: OrderStatus;
  cleaningType: CleaningType;
  fulfillment: Fulfillment;
  events: Array<{ status: OrderStatus; at: string }>;
}

/** Health-check response. */
export interface HealthResponse {
  ok: boolean;
  service: string;
  version: string;
  uptime: number;
  checks: {
    database: 'ok' | 'fail';
    redis: 'ok' | 'fail';
  };
}
