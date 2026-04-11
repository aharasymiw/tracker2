import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { sql } from 'drizzle-orm';
import { PROTOCOL_VERSION } from '@lod/protocol';
import type { Db } from '../../persistence/db.js';
import type { RedisClient } from '../../persistence/redis.js';

export interface HealthDeps {
  db: Db;
  redis: RedisClient;
}

/**
 * GET /health
 *
 * Actually pings Postgres (SELECT 1) and Redis (PING). Returns 503 if
 * either is down so load balancers remove this instance.
 */
export const healthRoutes: FastifyPluginAsync<HealthDeps> = async (
  app: FastifyInstance,
  deps,
) => {
  app.get('/health', async (_request, reply) => {
    const [pg, redis] = await Promise.all([
      pingPostgres(deps.db),
      pingRedis(deps.redis),
    ]);

    const healthy = pg && redis;
    const body = {
      status: healthy ? 'ok' : 'degraded',
      pg,
      redis,
      protocolVersion: PROTOCOL_VERSION,
    };

    if (!healthy) {
      reply.status(503);
    }

    return body;
  });
};

async function pingPostgres(db: Db): Promise<boolean> {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

async function pingRedis(redis: RedisClient): Promise<boolean> {
  try {
    const reply = await redis.ping();
    return reply === 'PONG';
  } catch {
    return false;
  }
}
