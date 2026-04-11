import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import websocket from '@fastify/websocket';
import secureSession from '@fastify/secure-session';
import type { Logger as PinoLogger } from 'pino';
import type { Env } from '../config/env.js';
import type { Db } from '../persistence/db.js';
import type { RedisClient } from '../persistence/redis.js';
import { registerRoutes } from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';

export interface BuildServerOptions {
  env: Env;
  db: Db;
  redis: RedisClient;
  logger: PinoLogger;
}

/**
 * Build a fully-configured Fastify app, ready to listen. This does NOT call
 * `.listen()` — that happens in `main.ts` after the GameWorld has started.
 */
export async function buildServer(
  opts: BuildServerOptions,
): Promise<FastifyInstance> {
  const app = Fastify({
    loggerInstance: opts.logger,
    disableRequestLogging: false,
    trustProxy: true,
  });

  app.setErrorHandler(errorHandler);

  await app.register(helmet, { global: true });

  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  // secure-session wants a 32-byte key. In dev we pad/truncate the
  // SESSION_SECRET. Production MUST supply a random 32-byte hex string.
  const sessionKey = Buffer.from(
    opts.env.SESSION_SECRET.padEnd(32, '0').slice(0, 32),
  );
  await app.register(secureSession, {
    key: sessionKey,
    cookie: {
      httpOnly: true,
      secure: opts.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    },
  });

  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    redis: opts.redis,
  });

  await app.register(websocket);

  await registerRoutes(app, {
    db: opts.db,
    redis: opts.redis,
    env: opts.env,
  });

  return app;
}
