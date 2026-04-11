import { PCG32 } from '@lod/game-rng';
import type {
  CombatPhase,
  Combatant,
  CombatSessionId,
  EntityId,
  ItemDefId,
  TickNumber,
  TileCoord,
} from '../types';
import type { Seed } from '@lod/shared-utils';
import { rollInitiativeOrder } from './initiative';

/**
 * Canonical log entry shape. This is what the client CombatEvent stream
 * ultimately renders; persisting it alongside the session gives us a free
 * audit trail for cheat investigations.
 */
export type CombatLogEntry =
  | {
      kind: 'phase-transition';
      from: CombatPhase;
      to: CombatPhase;
      round: number;
      tick: TickNumber;
    }
  | {
      kind: 'hit';
      actor: EntityId;
      target: EntityId;
      weaponId: ItemDefId;
      damage: number;
      crit: boolean;
      tick: TickNumber;
    }
  | {
      kind: 'miss';
      actor: EntityId;
      target: EntityId;
      weaponId: ItemDefId;
      tick: TickNumber;
    }
  | { kind: 'heal'; actor: EntityId; amount: number; tick: TickNumber }
  | { kind: 'flee'; actor: EntityId; success: boolean; tick: TickNumber }
  | { kind: 'defeat'; actor: EntityId; tick: TickNumber };

/**
 * Full combat session state. Serializes 1:1 to Postgres JSONB via
 * `serializeSession`. Keep this interface flat and JSON-safe — no Dates, no
 * Maps, no class instances. The PRNG is carried as its snapshot so we can
 * rehydrate mid-round after a restart.
 */
export interface CombatSessionState {
  id: CombatSessionId;
  seed: Seed;
  prngSnapshot: { state: string; inc: string };
  phase: CombatPhase;
  round: number;
  participants: Combatant[];
  turnOrder: EntityId[];
  currentTurnIndex: number;
  turnDeadlineTick?: TickNumber;
  centerPosition: TileCoord;
  createdAtTick: TickNumber;
  log: CombatLogEntry[];
  outcome?: { winnerTeam: 'A' | 'B' | 'draw'; endedAtTick: TickNumber };
}

/**
 * Build a fresh combat session. Rolls initiative, seeds the PRNG, snapshots
 * it so the returned state is already self-contained, and seeds the log
 * with an empty array. The returned object is the canonical initial state
 * — everything downstream (resolver, machine) treats it as immutable and
 * builds new states on top.
 */
export function createCombatSession(params: {
  id: CombatSessionId;
  seed: Seed;
  participants: Combatant[];
  centerPosition: TileCoord;
  createdAtTick: TickNumber;
}): CombatSessionState {
  // `Seed` is a branded number — pass the underlying primitive to PCG32.
  const prng = new PCG32(params.seed as number);

  // Fresh array so external mutation of `params.participants` can't leak in.
  const participants = params.participants.map((p) => ({ ...p }));

  // Roll initiative now. The seeded PRNG advances its state during the roll,
  // so we snapshot *after* — the first resolver call will pick up from the
  // post-initiative state. `Combatant.initiative` numeric fields are left
  // as the caller supplied them (UI display only); the authoritative order
  // lives on `turnOrder`.
  const turnOrder = rollInitiativeOrder(prng, participants);

  return {
    id: params.id,
    seed: params.seed,
    prngSnapshot: prng.snapshot(),
    phase: 'LongRange',
    round: 1,
    participants,
    turnOrder,
    currentTurnIndex: 0,
    centerPosition: { ...params.centerPosition },
    createdAtTick: params.createdAtTick,
    log: [],
  };
}

/**
 * Serialize a session to JSON for Postgres JSONB persistence. We stringify
 * directly rather than piping through a custom encoder because every field
 * on `CombatSessionState` is already JSON-safe by construction.
 */
export function serializeSession(s: CombatSessionState): string {
  return JSON.stringify(s);
}

/**
 * Deserialize a session from JSON. No schema validation happens here — if
 * you're pulling from an untrusted source, run a Zod schema check first.
 * The server reads from its own DB, so the rehydrate path is trusted.
 */
export function deserializeSession(json: string): CombatSessionState {
  return JSON.parse(json) as unknown as CombatSessionState;
}

/**
 * Look up a combatant by ID. Returns `undefined` if they aren't in the
 * session (dead combatants remain in the array with `isAlive: false`, so
 * this only returns undefined for truly unknown IDs).
 */
export function findCombatant(
  s: CombatSessionState,
  id: EntityId,
): Combatant | undefined {
  return s.participants.find((p) => p.id === id);
}

/**
 * Return the entity whose turn is current, or `undefined` if the turn order
 * is empty (should only happen in a degenerate session with no alive
 * combatants).
 */
export function currentActor(s: CombatSessionState): EntityId | undefined {
  return s.turnOrder[s.currentTurnIndex];
}
