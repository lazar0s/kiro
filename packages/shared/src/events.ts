import type { OrderStatus } from './enums.js';

/**
 * Socket.IO event names and payload types.
 * Keep in sync with server emits in apps/api and client listeners in apps/web.
 */

export const SocketEvent = {
  OrderCreated: 'order:created',
  OrderStatusChanged: 'order:status_changed',
  MachineStateUpdated: 'machine:state_updated',
  AlertNew: 'alert:new',
} as const;
export type SocketEvent = (typeof SocketEvent)[keyof typeof SocketEvent];

export interface OrderCreatedPayload {
  orderId: string;
  trackingCode: string;
  locationId: string;
}

export interface OrderStatusChangedPayload {
  orderId: string;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  locationId: string;
  changedAt: string;
}

export interface MachineStateUpdatedPayload {
  machineId: string;
  mieleDeviceId: string;
  locationId: string;
  state: {
    programName: string | null;
    remainingSeconds: number | null;
    status: string;
  };
}

export interface AlertNewPayload {
  alertId: string;
  triggerType: string;
  orderId: string | null;
  machineId: string | null;
  message: string;
  createdAt: string;
}

export interface SocketEventMap {
  [SocketEvent.OrderCreated]: OrderCreatedPayload;
  [SocketEvent.OrderStatusChanged]: OrderStatusChangedPayload;
  [SocketEvent.MachineStateUpdated]: MachineStateUpdatedPayload;
  [SocketEvent.AlertNew]: AlertNewPayload;
}
