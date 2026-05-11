import bcrypt from 'bcrypt';

/**
 * Password hashing utility.
 *
 * We use bcrypt with a cost factor of 12 — a reasonable balance between
 * security and latency on modest hardware (~250ms per hash). If the
 * deployment hardware is significantly more powerful, bump to 13 or 14.
 */
const BCRYPT_ROUNDS = 12;

/**
 * Legacy prefix used by the Phase 1 placeholder hasher in seed.ts.
 * If we find a user with this prefix, we rehash their password on next login.
 */
const PLACEHOLDER_PREFIX = 'placeholder:';

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  // Reject placeholder hashes from Phase 1 seed — auth module will rehash on login.
  if (hash.startsWith(PLACEHOLDER_PREFIX)) return false;
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}

export function isPlaceholderHash(hash: string): boolean {
  return hash.startsWith(PLACEHOLDER_PREFIX);
}
