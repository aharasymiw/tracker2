import type { FastifyInstance } from 'fastify';
import type { Env } from '../../config/env.js';
import type { Db } from '../../persistence/db.js';
import type { RedisClient } from '../../persistence/redis.js';
import { healthRoutes } from './health.js';
import { authRoutes } from './auth.js';
import { characterRoutes } from './characters.js';

export interface RouteDeps {
  db: Db;
  redis: RedisClient;
  env: Env;
}

/**
 * Wire all REST routes onto the Fastify instance. Called once from
 * `buildServer()`.
 */
export async function registerRoutes(
  app: FastifyInstance,
  deps: RouteDeps,
): Promise<void> {
  await app.register(async (scoped) => healthRoutes(scoped, deps));
  await app.register(async (scoped) => authRoutes(scoped, deps), {
    prefix: '/auth',
  });
  await app.register(async (scoped) => characterRoutes(scoped, deps), {
    prefix: '/characters',
  });
}
