import Fastify, { type FastifyBaseLogger, type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import websocket from '@fastify/websocket';
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
  // Cast pino Logger -> FastifyBaseLogger. The two are structurally compatible
  // at runtime (msgPrefix is optional in practice) but declared differently.
  const app = Fastify({
    loggerInstance: opts.logger as unknown as FastifyBaseLogger,
    disableRequestLogging: false,
    trustProxy: true,
  });

  app.setErrorHandler(errorHandler);

  await app.register(helmet, {
    global: true,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
      },
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    referrerPolicy: { policy: 'no-referrer' },
  });

  const corsOrigins = opts.env.CORS_ORIGIN.split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
  await app.register(cors, {
    origin: corsOrigins,
    credentials: true,
  });

  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    redis: opts.redis,
  });

  // `maxPayload` caps a single inbound WS frame. Any client intent — move,
  // attack, chat, trade — fits in a few hundred bytes; 16 KiB is a forgiving
  // ceiling that still stops trivial memory-exhaustion DoS from a malicious
  // peer streaming gigabyte frames.
  await app.register(websocket, {
    options: {
      maxPayload: 16 * 1024,
    },
  });

  await registerRoutes(app, {
    db: opts.db,
    redis: opts.redis,
    env: opts.env,
  });

  return app;
}
