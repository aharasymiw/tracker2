import { describe, expect, it } from 'vitest';
import { createRateLimiter } from '../auth/rateLimiter.js';
import type { RedisClient } from '../persistence/redis.js';

/**
 * In-memory fake of the small Redis surface we use. The rate limiter issues
 * its INCR+EXPIRE+TTL as a single `eval` call (atomic Lua script on a real
 * Redis), so the fake only needs to simulate `eval` with those three
 * operations plus `del` for the reset path.
 */
function makeFakeRedis(): RedisClient {
  const counters = new Map<string, number>();
  const ttls = new Map<string, number>();
  const fake = {
    async eval(
      _script: string,
      _numKeys: number,
      key: string,
      windowSec: string,
    ): Promise<[number, number]> {
      const next = (counters.get(key) ?? 0) + 1;
      counters.set(key, next);
      if (next === 1) {
        ttls.set(key, Number(windowSec));
      }
      return [next, ttls.get(key) ?? -1];
    },
    async del(key: string): Promise<number> {
      const had = counters.delete(key);
      ttls.delete(key);
      return had ? 1 : 0;
    },
  };
  return fake as unknown as RedisClient;
}

describe('rateLimiter', () => {
  it('allows up to max then blocks', async () => {
    const redis = makeFakeRedis();
    const limiter = createRateLimiter(redis, {
      key: 'test',
      max: 3,
      windowSec: 60,
    });

    const a = await limiter.check('ip-1');
    const b = await limiter.check('ip-1');
    const c = await limiter.check('ip-1');
    const d = await limiter.check('ip-1');

    expect(a.allowed).toBe(true);
    expect(b.allowed).toBe(true);
    expect(c.allowed).toBe(true);
    expect(d.allowed).toBe(false);
  });

  it('is isolated per identifier', async () => {
    const redis = makeFakeRedis();
    const limiter = createRateLimiter(redis, {
      key: 'test',
      max: 1,
      windowSec: 60,
    });
    const a = await limiter.check('ip-1');
    const b = await limiter.check('ip-2');
    expect(a.allowed).toBe(true);
    expect(b.allowed).toBe(true);
  });

  it('reset clears the counter', async () => {
    const redis = makeFakeRedis();
    const limiter = createRateLimiter(redis, {
      key: 'test',
      max: 1,
      windowSec: 60,
    });
    await limiter.check('ip-1');
    const blocked = await limiter.check('ip-1');
    expect(blocked.allowed).toBe(false);
    await limiter.reset('ip-1');
    const again = await limiter.check('ip-1');
    expect(again.allowed).toBe(true);
  });
});
