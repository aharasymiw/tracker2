import { loadContentPack } from '@lod/game-content';
import { env } from './config/env.js';
import { createLogger } from './observability/logger.js';
import { createDb } from './persistence/db.js';
import { createRedis } from './persistence/redis.js';
import { buildServer } from './http/server.js';
import { registerWsGateway } from './net/wsGateway.js';
import { GameWorld } from './game/GameWorld.js';
import { Scheduler } from './game/Scheduler.js';

async function main(): Promise<void> {
  const logger = createLogger(env);
  logger.info(
    { nodeEnv: env.NODE_ENV, port: env.PORT, host: env.HOST },
    'bootstrapping Land of Devastation server',
  );

  const db = createDb(env.DATABASE_URL);
  const redis = createRedis(env.REDIS_URL);
  const content = loadContentPack();

  const world = new GameWorld({ db, redis, content, logger });
  const scheduler = new Scheduler(
    env.TICK_RATE_HZ,
    (tick) => world.onTick(tick),
    logger,
  );

  world.start();
  scheduler.start();

  const app = await buildServer({ env, db, redis, logger });
  registerWsGateway(app, { redis, world });

  await app.listen({ port: env.PORT, host: env.HOST });
  logger.info({ port: env.PORT, host: env.HOST }, 'server listening');

  let shuttingDown = false;
  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'shutdown requested');
    try {
      scheduler.stop();
      world.stop();
      await app.close();
      await redis.quit();
    } catch (err: unknown) {
      logger.error({ err }, 'error during shutdown');
    }
    process.exit(0);
  };

  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });
  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
}

main().catch((err: unknown) => {
  // eslint-disable-next-line no-console
  console.error('fatal startup error:', err);
  process.exit(1);
});
