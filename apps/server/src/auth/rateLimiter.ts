import type { RedisClient } from '../persistence/redis.js';

/**
 * A simple token-bucket style rate limiter using a Redis Lua script so
 * INCR + EXPIRE + TTL read all happen atomically in a single round-trip.
 *
 * This is the *application-level* limiter used by auth endpoints and WS
 * intent dispatchers. Global per-route limits are handled separately via
 * `@fastify/rate-limit`.
 *
 * Why a Lua script:
 *   The naive `INCR` followed by a separate `EXPIRE` is not atomic. If the
 *   server crashes (or the client is cancelled) after the INCR but before
 *   the EXPIRE, the key is left without a TTL and the counter grows forever
 *   — a locked-out account or IP can never recover. The Lua script below
 *   runs on the Redis server in a single step: it increments, and if the
 *   key is new, sets the expiry in the same logical operation.
 */
export interface RateLimiterOptions {
  /**
   * A unique key prefix for this limiter (e.g. `auth:login`).
   */
  key: string;
  /**
   * Maximum number of events allowed per window.
   */
  max: number;
  /**
   * Window length in seconds.
   */
  windowSec: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetInSec: number;
}

export interface RateLimiter {
  check(identifier: string): Promise<RateLimitResult>;
  reset(identifier: string): Promise<void>;
}

/**
 * Lua script body: increment the counter, set expiry on first touch, return
 * {count, ttlSeconds}. Argument: window length in seconds.
 */
const INCR_WITH_EXPIRE_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('TTL', KEYS[1])
return {count, ttl}
`;

type IncrResult = [number, number];

export function createRateLimiter(
  redis: RedisClient,
  opts: RateLimiterOptions,
): RateLimiter {
  const composeKey = (identifier: string): string =>
    `ratelimit:${opts.key}:${identifier}`;

  return {
    async check(identifier: string): Promise<RateLimitResult> {
      const key = composeKey(identifier);
      const raw = (await redis.eval(
        INCR_WITH_EXPIRE_SCRIPT,
        1,
        key,
        String(opts.windowSec),
      )) as IncrResult;
      const count = Number(raw[0]);
      const ttl = Number(raw[1]);
      const remaining = Math.max(0, opts.max - count);
      return {
        allowed: count <= opts.max,
        remaining,
        resetInSec: ttl < 0 ? opts.windowSec : ttl,
      };
    },
    async reset(identifier: string): Promise<void> {
      await redis.del(composeKey(identifier));
    },
  };
}
