import { useEffect, useRef } from 'react';
import { SocketEvent, type SocketEventMap } from '@laundry/shared';
import { connectSocket, disconnectSocket, onSocketEvent } from '../lib/socket';

/**
 * Hook: connect to Socket.IO when a token is available, disconnect on unmount.
 *
 * @param accessToken — current JWT access token (or null if logged out)
 *
 * When used at the top of the authenticated layout (AppShell), this ensures a
 * single persistent connection for the lifetime of the session.
 */
export function useSocketConnection(accessToken: string | null): void {
  const connectedRef = useRef(false);

  useEffect(() => {
    if (!accessToken) {
      disconnectSocket();
      connectedRef.current = false;
      return;
    }
    if (!connectedRef.current) {
      connectSocket(accessToken);
      connectedRef.current = true;
    }
    return () => {
      disconnectSocket();
      connectedRef.current = false;
    };
  }, [accessToken]);
}

/**
 * Hook: subscribe to a single socket event. Re-subscribes if `handler` identity changes.
 *
 * @example
 *   useSocketEvent(SocketEvent.OrderCreated, (payload) => {
 *     addOrderToBoard(payload);
 *   });
 */
export function useSocketEvent<E extends SocketEvent>(
  event: E,
  handler: (payload: SocketEventMap[E]) => void,
): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const off = onSocketEvent(event, (payload) => {
      handlerRef.current(payload);
    });
    return off;
  }, [event]);
}
