import { io, type Socket } from 'socket.io-client';
import { SocketEvent, type SocketEventMap } from '@laundry/shared';

/**
 * Shared Socket.IO client instance for the dashboard.
 *
 * The client connects once the dashboard mounts with a valid access token.
 * Uses the same server URL as the REST API (proxied in dev by Vite, same origin
 * in production via nginx).
 *
 * Usage in components:
 *   import { connectSocket, disconnectSocket, onSocketEvent } from '../lib/socket';
 *
 *   // Connect when authenticated:
 *   connectSocket(accessToken);
 *
 *   // Listen:
 *   const off = onSocketEvent(SocketEvent.OrderCreated, (payload) => { ... });
 *
 *   // Cleanup:
 *   off(); // remove listener
 *   disconnectSocket(); // on logout
 */

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  return socket;
}

export function connectSocket(accessToken: string): Socket {
  if (socket?.connected) return socket;

  socket = io({
    // In dev, Vite proxies /socket.io/ to localhost:3000 (see vite.config.ts).
    // In prod, same origin so no explicit URL needed.
    auth: { token: accessToken },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
  });

  socket.on('connect', () => {
    console.log('[socket] connected', socket?.id);
  });

  socket.on('connect_error', (err) => {
    console.error('[socket] connection error', err.message);
  });

  socket.on('disconnect', (reason) => {
    console.log('[socket] disconnected', reason);
  });

  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * Register a typed listener. Returns an unsubscribe function.
 */
export function onSocketEvent<E extends SocketEvent>(
  event: E,
  handler: (payload: SocketEventMap[E]) => void,
): () => void {
  if (!socket) {
    console.warn('[socket] Not connected — listener for', event, 'will not fire');
    return () => {};
  }
  socket.on(event as string, handler as (...args: unknown[]) => void);
  return () => {
    socket?.off(event as string, handler as (...args: unknown[]) => void);
  };
}
