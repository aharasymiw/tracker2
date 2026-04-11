import type { EntityId, ItemDefId } from '../types';

/**
 * Actions a combatant can submit on their turn. Each variant carries only
 * the data needed by the resolver — weapon IDs, not weapon defs, so the
 * authoritative lookup happens against the combatant's inventory server-side.
 */
export type CombatAction =
  | { kind: 'AttackLongRange'; targetId: EntityId; weaponId: ItemDefId }
  | { kind: 'AttackClose'; targetId: EntityId; weaponId: ItemDefId }
  | { kind: 'UseItem'; itemDefId: ItemDefId; targetId?: EntityId }
  | { kind: 'Flee' }
  | { kind: 'Pass' };
