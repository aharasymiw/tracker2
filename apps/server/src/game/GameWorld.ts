import type { Logger as PinoLogger } from 'pino';
import type { CharacterId } from '@lod/shared-utils';
import type { ContentPack } from '@lod/game-content';
import type { Db } from '../persistence/db.js';
import type { RedisClient } from '../persistence/redis.js';
import type { Connection } from '../net/connection.js';
import { InterestManager } from '../net/interestManager.js';
import { CombatSessionStore } from './CombatSessionStore.js';

export interface GameWorldDeps {
  db: Db;
  redis: RedisClient;
  content: ContentPack;
  logger: PinoLogger;
}

/**
 * Authoritative game world.
 *
 * One instance per process. Owns:
 *   - the master tick counter
 *   - the connection set (keyed by character id)
 *   - the interest manager
 *   - the combat session store
 *
 * For Phase 0 only `addConnection`, `removeConnection`, and an `onTick` stub
 * that increments and logs at debug are implemented. Everything else is
 * deferred to subsequent phases.
 */
export class GameWorld {
  private tick = 0;
  private started = false;
  private readonly connections = new Map<CharacterId, Connection>();
  private readonly interest: InterestManager;
  private readonly combat: CombatSessionStore;
  private readonly logger: PinoLogger;

  constructor(private readonly deps: GameWorldDeps) {
    this.logger = deps.logger.child({ subsystem: 'world' });
    this.interest = new InterestManager();
    this.combat = new CombatSessionStore(deps.db);
  }

  start(): void {
    if (this.started) return;
    this.started = true;
    this.logger.info('GameWorld starting');
    // TODO: Phase 2+ — warm up caches, rehydrate active combat sessions,
    // subscribe to Redis pub/sub channels, etc.
  }

  stop(): void {
    if (!this.started) return;
    this.started = false;
    this.logger.info('GameWorld stopping');
    for (const conn of this.connections.values()) {
      try {
        conn.close(1001, 'server shutting down');
      } catch (err: unknown) {
        this.logger.warn({ err }, 'error closing connection on shutdown');
      }
    }
    this.connections.clear();
  }

  onTick(tick: number): void {
    this.tick = tick;
    // TODO: Phase 3+ — advance presence, resolve combat turn deadlines,
    // broadcast StateDelta to subscribers via the interest manager.
    this.logger.debug({ tick }, 'tick');
  }

  getTick(): number {
    return this.tick;
  }

  addConnection(conn: Connection): void {
    this.connections.set(conn.characterId, conn);
    this.logger.info(
      { characterId: conn.characterId, count: this.connections.size },
      'connection added',
    );
  }

  removeConnection(charId: CharacterId): void {
    if (this.connections.delete(charId)) {
      this.logger.info(
        { characterId: charId, count: this.connections.size },
        'connection removed',
      );
    }
  }

  getInterest(): InterestManager {
    return this.interest;
  }

  getCombatStore(): CombatSessionStore {
    return this.combat;
  }
}
