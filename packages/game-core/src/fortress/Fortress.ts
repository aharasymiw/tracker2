import type { CharacterId, TileCoord } from '../types';

/** TODO: Phase 9/10 implementation — player-built fortress state. */
export interface FortressState {
  id: string;
  ownerId: CharacterId;
  position: TileCoord;
  wallHp: number;
  defenseField: number;
  tollCredits: number;
}
