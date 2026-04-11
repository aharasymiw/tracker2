import type { RedisClient } from '../persistence/redis.js';

/**
 * A simple token-bucket style rate limiter using Redis INCR + EXPIRE.
 *
 * This is the *application-level* limiter used by auth endpoints and WS
 * intent dispatchers. Global per-route limits are handled separately via
 * `@fastify/rate-limit`.
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

export function createRateLimiter(
  redis: RedisClient,
  opts: RateLimiterOptions,
): RateLimiter {
  const composeKey = (identifier: string): string =>
    `ratelimit:${opts.key}:${identifier}`;

  return {
    async check(identifier: string): Promise<RateLimitResult> {
      const key = composeKey(identifier);
      const count = await redis.incr(key);
      if (count === 1) {
        await redis.expire(key, opts.windowSec);
      }
      const ttl = await redis.ttl(key);
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
