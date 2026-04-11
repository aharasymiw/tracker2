import { createHash, randomBytes } from 'node:crypto';
import type { RedisClient } from '../persistence/redis.js';

/**
 * Session token management, backed by Redis.
 *
 * - Tokens are 32 random bytes, hex-encoded (64 chars) — what we put in the
 *   HttpOnly cookie.
 * - Redis stores only the SHA-256 hash of the token, so a Redis dump can't
 *   be replayed.
 * - TTL is applied via Redis EXPIRE; revocation is instant via DEL.
 */

const SESSION_PREFIX = 'session:';
const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export interface SessionPayload {
  userId: string;
  issuedAt: number;
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function keyFor(token: string): string {
  return `${SESSION_PREFIX}${hashToken(token)}`;
}

/**
 * Mint a new session token for a user and persist it to Redis with a TTL.
 * Returns the raw token — caller is responsible for putting it in a
 * Secure + HttpOnly cookie.
 */
export async function createSession(
  redis: RedisClient,
  userId: string,
  ttlSeconds: number = DEFAULT_TTL_SECONDS,
): Promise<string> {
  const token = randomBytes(32).toString('hex');
  const payload: SessionPayload = {
    userId,
    issuedAt: Date.now(),
  };
  await redis.set(keyFor(token), JSON.stringify(payload), 'EX', ttlSeconds);
  return token;
}

/**
 * Look up a session token and return its payload, or null if missing/expired.
 */
export async function getSession(
  redis: RedisClient,
  token: string,
): Promise<SessionPayload | null> {
  const raw = await redis.get(keyFor(token));
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'userId' in parsed &&
      'issuedAt' in parsed &&
      typeof (parsed as { userId: unknown }).userId === 'string' &&
      typeof (parsed as { issuedAt: unknown }).issuedAt === 'number'
    ) {
      return parsed as SessionPayload;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Revoke a session. Called on logout, password reset, or admin ban.
 */
export async function revokeSession(
  redis: RedisClient,
  token: string,
): Promise<void> {
  await redis.del(keyFor(token));
}
