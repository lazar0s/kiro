import type { UserRole } from '@laundry/shared';

/**
 * JWT payload shapes.
 *
 * Access tokens are short-lived (15m default) and carry the user's role so
 * route handlers can do RBAC without a DB round-trip per request.
 * Refresh tokens are long-lived (7d) and carry only the user id + token version.
 *
 * We keep `type` inside both payloads so a leaked access token can never be
 * swapped in as a refresh token or vice versa.
 */

export interface AccessTokenPayload {
  type: 'access';
  sub: string; // user id
  role: UserRole;
  email: string;
}

export interface RefreshTokenPayload {
  type: 'refresh';
  sub: string; // user id
  /**
   * Monotonically increasing counter. Bumping it on the user invalidates all
   * outstanding refresh tokens (logout everywhere, password change, etc.).
   * Tracked on the User row as `tokenVersion`.
   */
  tv: number;
}

export type TokenPayload = AccessTokenPayload | RefreshTokenPayload;
