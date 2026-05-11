import type { FastifyInstance } from 'fastify';
import type { User } from '@prisma/client';
import { env } from '../../config/env.js';
import { prisma } from '../../shared/database.js';
import { verifyPassword } from '../../shared/passwords.js';
import type { AccessTokenPayload, RefreshTokenPayload } from '../../shared/jwt.js';
import type { AuthUserPublic, TokenPair } from './auth.schemas.js';

/**
 * Parse a TTL string like "15m", "7d", "3600" into seconds.
 * Kept tiny to avoid pulling in a date library just for this.
 */
export function parseTtlToSeconds(ttl: string): number {
  const match = /^(\d+)\s*([smhd])?$/.exec(ttl.trim());
  if (!match) return 900; // 15m fallback
  const value = Number(match[1]);
  const unit = match[2] ?? 's';
  const multiplier: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  return value * (multiplier[unit] ?? 1);
}

export function toPublicUser(user: User): AuthUserPublic {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    locationId: user.locationId,
  };
}

/**
 * Attempt to authenticate an email/password pair.
 * Returns the user on success, or null on any failure (wrong email, wrong
 * password, inactive user). Callers should not distinguish between these cases
 * in error messages to avoid user enumeration.
 */
export async function authenticateCredentials(
  email: string,
  password: string,
): Promise<User | null> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) return null;
  const ok = await verifyPassword(password, user.passwordHash);
  return ok ? user : null;
}

/**
 * Issue a fresh access + refresh token pair for a user.
 * Access tokens are signed with JWT_ACCESS_SECRET, refresh tokens with
 * JWT_REFRESH_SECRET — different secrets so leakage of one doesn't
 * compromise the other token class.
 */
export async function issueTokens(app: FastifyInstance, user: User): Promise<TokenPair> {
  const accessPayload: AccessTokenPayload = {
    type: 'access',
    sub: user.id,
    role: user.role,
    email: user.email,
  };
  const refreshPayload: RefreshTokenPayload = {
    type: 'refresh',
    sub: user.id,
    tv: user.tokenVersion,
  };

  const accessToken = await app.jwt.sign(accessPayload, { expiresIn: env.JWT_ACCESS_TTL });
  // Refresh tokens are signed with a different secret — we use the named
  // signer registered alongside @fastify/jwt. See app.ts for registration.
  const refreshToken = await app.jwtRefresh.sign(refreshPayload, { expiresIn: env.JWT_REFRESH_TTL });

  return {
    accessToken,
    refreshToken,
    expiresIn: parseTtlToSeconds(env.JWT_ACCESS_TTL),
  };
}

/**
 * Validate a refresh token and return a new token pair.
 * The refresh token's `tv` (tokenVersion) must match the user's current
 * tokenVersion — bumping that column invalidates all outstanding tokens.
 */
export async function rotateTokens(
  app: FastifyInstance,
  refreshToken: string,
): Promise<TokenPair | null> {
  let payload: RefreshTokenPayload;
  try {
    payload = (await app.jwtRefresh.verify(refreshToken)) as RefreshTokenPayload;
  } catch {
    return null;
  }
  if (payload.type !== 'refresh') return null;

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || !user.isActive) return null;
  if (user.tokenVersion !== payload.tv) return null;

  return issueTokens(app, user);
}

/**
 * Logout everywhere by bumping tokenVersion — any outstanding refresh token
 * will fail the `tv` check on its next rotation attempt.
 */
export async function revokeAllTokens(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { tokenVersion: { increment: 1 } },
  });
}
