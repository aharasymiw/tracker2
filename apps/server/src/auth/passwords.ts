import { hash, verify } from '@node-rs/argon2';

/**
 * Argon2id parameters, calibrated for ~250 ms on a Fly.io shared-cpu-1x.
 * Adjust as hardware improves.
 *
 * NOTE: @node-rs/argon2 defaults to Argon2id so we omit the `algorithm` field
 * rather than importing the const enum (which is incompatible with
 * isolatedModules).
 */
const ARGON2_OPTIONS = {
  memoryCost: 65536, // 64 MiB
  timeCost: 3,
  parallelism: 1,
} as const;

/**
 * Hash a password with a pepper prepended.
 *
 * Pepper is stored in an env var, NEVER in the database. A leaked DB alone
 * therefore cannot be offline-cracked without also obtaining the pepper.
 */
export async function hashPassword(
  password: string,
  pepper: string,
): Promise<string> {
  return hash(pepper + password, ARGON2_OPTIONS);
}

/**
 * Constant-time compare against an Argon2 hash. Returns false on any
 * parse error — never throws.
 */
export async function verifyPassword(
  hashValue: string,
  password: string,
  pepper: string,
): Promise<boolean> {
  try {
    return await verify(hashValue, pepper + password);
  } catch {
    return false;
  }
}
