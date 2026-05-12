import { SocketEvent, type SocketEventMap } from '@laundry/shared';
import { getIO } from './socket.js';
import { logger } from './logger.js';

/**
 * Emit a typed event to Socket.IO rooms.
 *
 * This is the single point through which all real-time broadcasts flow.
 * Modules call `emit(event, payload, rooms)` and this handles:
 *  - logging the emission
 *  - sending to all specified rooms (defaults to 'dashboard')
 *  - gracefully no-op-ing if Socket.IO isn't initialized (tests, seed script, etc.)
 */
export function emit<E extends SocketEvent>(
  event: E,
  payload: SocketEventMap[E],
  rooms: string | string[] = 'dashboard',
): void {
  let io;
  try {
    io = getIO();
  } catch {
    // Socket.IO not initialized — fine during seed/tests.
    return;
  }

  const targetRooms = Array.isArray(rooms) ? rooms : [rooms];
  logger.debug({ event, rooms: targetRooms }, 'Emitting socket event');
  io.to(targetRooms).emit(event, payload);
}

/**
 * Convenience: broadcast an order event to both dashboard and delivery rooms.
 * Most order state changes are relevant to everyone.
 */
export function emitOrderEvent<E extends typeof SocketEvent.OrderCreated | typeof SocketEvent.OrderStatusChanged>(
  event: E,
  payload: SocketEventMap[E],
): void {
  emit(event, payload, ['dashboard', 'delivery']);
}

/**
 * Emit a machine state update — only the dashboard cares.
 */
export function emitMachineUpdate(payload: SocketEventMap[typeof SocketEvent.MachineStateUpdated]): void {
  emit(SocketEvent.MachineStateUpdated, payload, 'dashboard');
}

/**
 * Emit an alert — to dashboard + the specific user if targeted.
 */
export function emitAlert(
  payload: SocketEventMap[typeof SocketEvent.AlertNew],
  targetUserId?: string,
): void {
  const rooms = ['dashboard'];
  if (targetUserId) rooms.push(`user:${targetUserId}`);
  emit(SocketEvent.AlertNew, payload, rooms);
}
