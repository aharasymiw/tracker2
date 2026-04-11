import type { FastifyInstance } from 'fastify';
import type { RedisClient } from '../persistence/redis.js';
import { getSession } from '../auth/sessions.js';
import type { GameWorld } from '../game/GameWorld.js';
import { dispatchIntent } from '../game/intents/index.js';
import { Connection } from './connection.js';
import type { WebSocketTransport } from './transport.js';
import { toCharacterId, toUserId } from '@lod/shared-utils';

const SESSION_COOKIE_KEY = 'lodSessionToken';

export interface WsGatewayDeps {
  redis: RedisClient;
  world: GameWorld;
}

/**
 * Register the `/ws` WebSocket endpoint. `@fastify/websocket` must already
 * be registered on the Fastify instance.
 *
 * Flow on connection:
 *   1. Extract session cookie from the upgrade request; reject if absent.
 *   2. Resolve the userId via Redis; reject on miss.
 *   3. (Phase 2) resolve an active characterId for the user.
 *   4. Wrap the socket in a `Connection` and register with `GameWorld`.
 *   5. Pipe inbound frames through the envelope tracker → intent dispatcher.
 */
export function registerWsGateway(
  app: FastifyInstance,
  deps: WsGatewayDeps,
): void {
  app.get('/ws', { websocket: true }, async (socket, request) => {
    const token = readSessionCookie(request.headers.cookie);
    if (token === null) {
      socket.close(4401, 'unauthenticated');
      return;
    }

    const session = await getSession(deps.redis, token);
    if (session === null) {
      socket.close(4401, 'session expired');
      return;
    }

    // TODO: Phase 2 — look up the active character for this user. For now
    // we bind the connection to a placeholder character id derived from the
    // userId so the wsGateway plumbing type-checks end to end.
    const userId = toUserId(session.userId);
    const characterId = toCharacterId(`pending:${session.userId}`);

    const transport: WebSocketTransport = {
      send: (msg) => {
        socket.send(msg);
      },
      close: (code, reason) => {
        socket.close(code, reason);
      },
      onMessage: (handler) => {
        socket.on('message', (data: Buffer) => handler(data.toString('utf8')));
      },
      onClose: (handler) => {
        socket.on('close', handler);
      },
    };

    const connection = new Connection(userId, characterId, transport);
    deps.world.addConnection(connection);

    transport.onMessage((raw) => {
      const parsed = connection.envelope.parse(raw);
      if (!parsed.ok) {
        connection.sendJson('Error', {
          code: parsed.error.kind,
          message: parsed.error.message,
        });
        return;
      }

      const result = dispatchIntent(parsed.value, {
        connection,
        world: deps.world,
      });
      if (!result.ok) {
        connection.sendJson('Error', {
          code: result.error.code,
          message: result.error.message,
        });
      }
    });

    transport.onClose(() => {
      deps.world.removeConnection(characterId);
    });
  });
}

function readSessionCookie(
  cookieHeader: string | undefined,
): string | null {
  if (cookieHeader === undefined) return null;
  const parts = cookieHeader.split(';').map((p) => p.trim());
  for (const part of parts) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    if (part.slice(0, eq) === SESSION_COOKIE_KEY) {
      return part.slice(eq + 1);
    }
  }
  return null;
}

