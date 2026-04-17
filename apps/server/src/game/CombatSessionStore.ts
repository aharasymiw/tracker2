import type { CharacterId, CombatSessionId } from '@lod/shared-utils';
import type { Db } from '../persistence/db.js';

/**
 * In-memory index of active combat sessions, backed by the `combat_sessions`
 * Postgres table for rehydration on restart.
 *
 * TODO: Phase 4/7 — implement:
 *   - `load(id)`  — fetch from DB, deserialize state JSONB
 *   - `save(s)`   — serialize and upsert
 *   - `end(id)`   — mark ended_at and persist outcome
 *
 * For now this is a plain `Map` stub with no persistence. The shape exists
 * so wsGateway and GameWorld can depend on it without waiting for phase 4.
 */
export interface ActiveCombatRecord {
  id: CombatSessionId;
  participants: readonly CharacterId[];
  state: unknown;
}

export class CombatSessionStore {
  private readonly active = new Map<CombatSessionId, ActiveCombatRecord>();
  private readonly charToSession = new Map<CharacterId, CombatSessionId>();

  constructor(private readonly db: Db) {
    void this.db;
  }

  get(id: CombatSessionId): ActiveCombatRecord | undefined {
    return this.active.get(id);
  }

  getByCharacter(charId: CharacterId): ActiveCombatRecord | undefined {
    const sessionId = this.charToSession.get(charId);
    if (sessionId === undefined) return undefined;
    return this.active.get(sessionId);
  }

  put(record: ActiveCombatRecord): void {
    this.active.set(record.id, record);
    for (const charId of record.participants) {
      this.charToSession.set(charId, record.id);
    }
  }

  delete(id: CombatSessionId): void {
    const record = this.active.get(id);
    if (record !== undefined) {
      for (const charId of record.participants) {
        this.charToSession.delete(charId);
      }
    }
    this.active.delete(id);
  }

  count(): number {
    return this.active.size;
  }
}
