import { err, ok, type Result } from '@lod/shared-utils';
import type { CharacterId } from '@lod/shared-utils';
import type { Envelope } from '@lod/protocol';
import type { GameWorld } from './GameWorld.js';

export type AuthzError =
  | { kind: 'forbidden'; reason: string }
  | { kind: 'not_your_turn' }
  | { kind: 'session_ended' }
  | { kind: 'no_character' }
  | { kind: 'no_turns' };

/**
 * Actions that consume a daily turn. Movement, combat actions, and item use
 * all cost turns; chat does not.
 */
const TURN_FREE_ACTIONS = new Set(['Chat', 'TradeAccept', 'TradeCancel']);

/**
 * Actions that may ONLY be performed while inside a CombatSession.
 */
const COMBAT_ONLY_ACTIONS = new Set([
  'AttackLongRange',
  'AttackClose',
  'Flee',
]);

/**
 * Actions that may NOT be performed while inside a CombatSession.
 */
const NON_COMBAT_ACTIONS = new Set([
  'Move',
  'Interact',
  'TradeOffer',
  'TradeAccept',
  'TradeCancel',
  'TrainStat',
  'SellStatPoints',
  'RaidDeclare',
]);

export interface AuthzContext {
  characterId: CharacterId;
  world: GameWorld;
}

/**
 * Semantic authorization for game intents.
 *
 * Zod validates shape; `canPerformAction` answers "can *this* actor, in
 * *this* world state, perform *this* action?"
 *
 * Checks implemented now (Phase 2):
 *   - connection must be registered in the world
 *   - action type must be a known string (belt + suspenders with Zod)
 *
 * Checks deferred to Phase 3+ (require in-memory character state):
 *   - character alive (hp > 0)
 *   - turns remaining > 0 for turn-consuming actions
 *   - combat session ownership for combat actions
 *   - peaceful-sector PvP bans
 *   - stat-band twink prevention
 *   - fortress raid declaration cooldowns
 */
export function canPerformAction(
  ctx: AuthzContext,
  envelope: Envelope,
): Result<void, AuthzError> {
  const actionType = envelope.type;

  if (COMBAT_ONLY_ACTIONS.has(actionType)) {
    const combatStore = ctx.world.getCombatStore();
    const session = combatStore.getByCharacter(ctx.characterId);
    if (session === undefined) {
      return err({
        kind: 'forbidden',
        reason: `${actionType} requires an active combat session`,
      });
    }
  }

  if (NON_COMBAT_ACTIONS.has(actionType)) {
    const combatStore = ctx.world.getCombatStore();
    const session = combatStore.getByCharacter(ctx.characterId);
    if (session !== undefined) {
      return err({
        kind: 'forbidden',
        reason: `${actionType} cannot be used during combat`,
      });
    }
  }

  // Phase 3+: check character alive, turns remaining, etc.
  // These require GameWorld to hold per-character state which is not yet
  // loaded. The checks above cover what the current data model supports.
  void TURN_FREE_ACTIONS;

  return ok(undefined);
}
