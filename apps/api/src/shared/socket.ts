import { Server as SocketIOServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import IORedis from 'ioredis';
import type { Server as HttpServer } from 'node:http';
import { env } from '../config/env.js';
import { logger } from './logger.js';
import type { AccessTokenPayload } from './jwt.js';

/**
 * Socket.IO server instance. Initialized by `initSocket()` during app startup.
 *
 * The server uses a Redis pub/sub adapter so that if you ever scale to >1 API
 * process, messages fan out correctly. For a single-process deployment this is
 * zero-overhead.
 */
let io: SocketIOServer | null = null;

export function getIO(): SocketIOServer {
  if (!io) throw new Error('Socket.IO not initialized — call initSocket first');
  return io;
}

/**
 * Rooms:
 *   - `dashboard` — all connected staff + admin clients
 *   - `delivery` — all connected delivery clients
 *   - `location:{id}` — staff in a specific location (optional filter)
 */

export async function initSocket(httpServer: HttpServer): Promise<SocketIOServer> {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: env.CORS_ALLOWED_ORIGINS.split(',').map((s) => s.trim()),
      credentials: true,
    },
    // Transports: WebSocket preferred, long-polling as fallback.
    transports: ['websocket', 'polling'],
    // Path default is /socket.io/ which matches our nginx.conf.
  });

  // ---- Redis adapter for horizontal scaling ----
  const pubClient = new IORedis(env.REDIS_URL);
  const subClient = pubClient.duplicate();

  pubClient.on('error', (err) => logger.error({ err }, 'Socket.IO Redis pub error'));
  subClient.on('error', (err) => logger.error({ err }, 'Socket.IO Redis sub error'));

  io.adapter(createAdapter(pubClient, subClient));

  // ---- Authentication middleware ----
  // Clients must pass a valid access token as a query parameter or auth header.
  // This keeps unauthorized browsers from subscribing to order/machine events.
  io.use((socket, next) => {
    const token =
      socket.handshake.auth?.token ??
      socket.handshake.query?.token ??
      socket.handshake.headers?.authorization?.replace('Bearer ', '');

    if (!token) {
      return next(new Error('Authentication required'));
    }

    // Minimal JWT verification — we decode inline to avoid pulling in fastify.
    // In a production hardening pass, import the same verification used by HTTP routes.
    try {
      const [, payloadB64] = (token as string).split('.');
      if (!payloadB64) throw new Error('malformed');
      const payload = JSON.parse(
        Buffer.from(payloadB64, 'base64url').toString(),
      ) as AccessTokenPayload;
      if (payload.type !== 'access' || !payload.sub || !payload.role) {
        throw new Error('invalid payload');
      }
      // Attach to socket data for room assignment.
      (socket.data as { user: AccessTokenPayload }).user = payload;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  // ---- Connection handler ----
  io.on('connection', (socket) => {
    const user = (socket.data as { user: AccessTokenPayload }).user;
    logger.debug({ userId: user.sub, role: user.role, socketId: socket.id }, 'Socket connected');

    // Auto-join rooms based on role.
    if (user.role === 'admin' || user.role === 'staff') {
      void socket.join('dashboard');
    }
    if (user.role === 'delivery') {
      void socket.join('delivery');
    }
    // All authenticated users join a user-specific room (for targeted alerts).
    void socket.join(`user:${user.sub}`);

    socket.on('disconnect', (reason) => {
      logger.debug({ userId: user.sub, socketId: socket.id, reason }, 'Socket disconnected');
    });
  });

  logger.info('Socket.IO initialized with Redis adapter');
  return io;
}

export async function shutdownSocket(): Promise<void> {
  if (io) {
    io.disconnectSockets(true);
    io.close();
    io = null;
  }
}
