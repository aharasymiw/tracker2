import type { CombatSessionId } from '@lod/shared-utils';
import type { Db } from '../persistence/db.js';

/**
 * In-memory index of active combat sessions, backed by the `combat_sessions`
 * Postgres table for rehydration on restart.
 *
 * TODO: Phase 4/7 — implement:
 *   - `load(id)`  — fetch from DB, deserialize state JSONB
 *   - `save(s)`   — serialize and upsert
 *   - `end(id)`   — mark ended_at and persist outcome
 *   - `activeForCharacter(characterId)` — index for reconnect flow
 *
 * For now this is a plain `Map` stub with no persistence. The shape exists
 * so wsGateway and GameWorld can depend on it without waiting for phase 4.
 */
// Opaque active-session record. Actual shape comes from
// `@lod/game-core`'s CombatSessionState once we wire it in.
export interface ActiveCombatRecord {
  id: CombatSessionId;
  // TODO: Phase 4 — `state: CombatSessionState` from @lod/game-core
  state: unknown;
}

export class CombatSessionStore {
  private readonly active = new Map<CombatSessionId, ActiveCombatRecord>();

  constructor(private readonly db: Db) {
    // db reserved for persistence calls added in Phase 4.
    void this.db;
  }

  get(id: CombatSessionId): ActiveCombatRecord | undefined {
    return this.active.get(id);
  }

  put(record: ActiveCombatRecord): void {
    this.active.set(record.id, record);
  }

  delete(id: CombatSessionId): void {
    this.active.delete(id);
  }

  count(): number {
    return this.active.size;
  }
}
