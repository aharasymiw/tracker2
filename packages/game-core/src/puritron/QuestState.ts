import type { CharacterId, TileCoord } from '../types';
import type { SectorId } from '@lod/shared-utils';

/** TODO: Phase 9/10 implementation — Puritron recovery quest progress. */
export interface PuritronPart {
  partIndex: number;
  heldBy: CharacterId | null;
  location: { sectorId: SectorId; position: TileCoord } | null;
  returnedToBase: boolean;
}

/** TODO: Phase 9/10 implementation — per-character quest state summary. */
export interface CharacterQuestState {
  characterId: CharacterId;
  puritronPartsReturned: number;
  dailyTurnCapBonus: number;
}
