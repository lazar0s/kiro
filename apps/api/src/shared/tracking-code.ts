import { randomBytes } from 'node:crypto';

/**
 * Human-friendly tracking code generator.
 *
 * We use an alphabet of 32 unambiguous characters (no I/l/1/0/O) so the code
 * reads correctly if a customer reads it aloud or types it from a screen.
 * 10 characters × log2(32) = 50 bits of entropy, which is more than enough
 * for the scale of a single laundry store and still short enough to be cozy.
 */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const DEFAULT_LENGTH = 10;

export function generateTrackingCode(length = DEFAULT_LENGTH): string {
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) {
    // Modulo bias is negligible at 32 / 256 = exact divisor.
    out += ALPHABET[bytes[i]! % ALPHABET.length];
  }
  return out;
}
