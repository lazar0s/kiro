import type { AccessTokenPayload, RefreshTokenPayload } from './jwt.js';

/**
 * Module augmentation so `request.user` is typed as our access-token payload
 * and `fastify.jwt.sign`/`verify` know the payload shape.
 *
 * We keep two token types (access + refresh); we default the augmentation to
 * AccessTokenPayload because that's what `jwtVerify()` returns on protected
 * routes. Refresh verification uses an explicit secret and cast.
 */
declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: AccessTokenPayload | RefreshTokenPayload;
    user: AccessTokenPayload;
  }
}
