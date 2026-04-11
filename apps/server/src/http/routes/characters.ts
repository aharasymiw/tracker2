import type {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyRequest,
} from 'fastify';
import type { Env } from '../../config/env.js';
import type { Db } from '../../persistence/db.js';
import type { RedisClient } from '../../persistence/redis.js';
import { getSession } from '../../auth/sessions.js';

export interface CharactersDeps {
  db: Db;
  redis: RedisClient;
  env: Env;
}

const SESSION_COOKIE_KEY = 'lodSessionToken';

/**
 * Character routes. Phase 0: only GET is authenticated and returns an empty
 * list. POST/DELETE are stubbed to 501. Phase 2 will fill these in with
 * point-buy validation and soft-delete.
 *
 * TODO: Phase 2 — wire up create/delete, stat allocation, name uniqueness.
 */
export const characterRoutes: FastifyPluginAsync<CharactersDeps> = async (
  app: FastifyInstance,
  deps,
) => {
  app.get('/', async (request, reply) => {
    const session = await requireSession(request, deps.redis);
    if (session === null) {
      reply.status(401);
      return { error: { code: 'unauthenticated', message: 'Sign in required' } };
    }
    // TODO: Phase 2 — fetch characters for session.userId using deps.db
    return { characters: [] as unknown[] };
  });

  app.post('/', async (_request, reply) => {
    // TODO: Phase 2
    reply.status(501);
    return { error: { code: 'not_implemented', message: 'Phase 2' } };
  });

  app.delete('/:id', async (_request, reply) => {
    // TODO: Phase 2
    reply.status(501);
    return { error: { code: 'not_implemented', message: 'Phase 2' } };
  });
};

async function requireSession(
  request: FastifyRequest,
  redis: RedisClient,
): Promise<{ userId: string } | null> {
  const header = request.headers.cookie;
  if (header === undefined) return null;
  const parts = header.split(';').map((p) => p.trim());
  let token: string | null = null;
  for (const part of parts) {
    const eqIndex = part.indexOf('=');
    if (eqIndex === -1) continue;
    if (part.slice(0, eqIndex) === SESSION_COOKIE_KEY) {
      token = part.slice(eqIndex + 1);
      break;
    }
  }
  if (token === null) return null;
  const session = await getSession(redis, token);
  if (session === null) return null;
  return { userId: session.userId };
}
