import Redis from 'ioredis';

/**
 * Create an ioredis client. Caller is responsible for calling `.quit()` at
 * shutdown.
 */
export function createRedis(url: string): Redis {
  return new Redis(url, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: false,
  });
}

export type RedisClient = Redis;
