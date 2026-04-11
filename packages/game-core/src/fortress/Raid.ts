import type { CombatSessionId, EntityId, TickNumber } from '../types';

/** TODO: Phase 9/10 implementation — fortress raid declaration state. */
export interface RaidState {
  id: string;
  fortressId: string;
  raiders: EntityId[];
  combatSessionId: CombatSessionId | null;
  declaredAtTick: TickNumber;
  defenderResponseDeadlineTick: TickNumber;
}
