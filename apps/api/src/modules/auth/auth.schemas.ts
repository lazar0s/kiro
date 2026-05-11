import { z } from 'zod';

/**
 * Request/response schemas for the auth module.
 * Kept co-located with the routes for easy discovery.
 */

export const LoginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginBody = z.infer<typeof LoginBody>;

export const RefreshBody = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshBody = z.infer<typeof RefreshBody>;

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // access-token TTL in seconds
}

export interface AuthUserPublic {
  id: string;
  email: string;
  name: string;
  role: string;
  locationId: string | null;
}

export interface LoginResponse extends TokenPair {
  user: AuthUserPublic;
}
