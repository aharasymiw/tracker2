import type { PCG32 } from '@lod/game-rng';
import { initiative as rollInitiativeValue } from '../stats/formulas';
import type { Combatant, EntityId } from '../types';

/**
 * Roll initiative for every participant and return their entity IDs in
 * descending turn order. Ties are broken by `entityId` (lexicographic) to
 * keep the order deterministic across runs with the same seed.
 *
 * Note: this does NOT mutate the input combatants. If the caller wants the
 * rolled values cached on the `Combatant.initiative` field, it should map
 * them itself after calling this function — we only return the order.
 */
export function rollInitiativeOrder(
  rng: PCG32,
  participants: readonly Combatant[],
): EntityId[] {
  const withInit = participants
    .filter((p) => p.isAlive)
    .map((p) => ({
      id: p.id,
      value: rollInitiativeValue(rng, p.stats.agl),
    }));

  withInit.sort((a, b) => {
    if (b.value !== a.value) return b.value - a.value;
    // Tie-break on string ID for determinism. EntityId is structurally a
    // string (branded CharacterId or plain enemy id), so localeCompare-free
    // string comparison is adequate and locale-independent.
    if (a.id < b.id) return -1;
    if (a.id > b.id) return 1;
    return 0;
  });

  return withInit.map((entry) => entry.id);
}
