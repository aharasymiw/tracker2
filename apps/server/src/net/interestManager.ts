import type { CharacterId, SectorId } from '@lod/shared-utils';

/**
 * Interest manager stub.
 *
 * Phase 3+ will make this actually broadcast sector deltas only to characters
 * whose area-of-interest intersects the event. For now it's just a bookkeeping
 * skeleton so the gateway and GameWorld have something to plug into.
 */
export class InterestManager {
  private readonly bySector = new Map<SectorId, Set<CharacterId>>();

  subscribe(charId: CharacterId, sectorId: SectorId): void {
    let set = this.bySector.get(sectorId);
    if (set === undefined) {
      set = new Set<CharacterId>();
      this.bySector.set(sectorId, set);
    }
    set.add(charId);
  }

  unsubscribe(charId: CharacterId, sectorId: SectorId): void {
    const set = this.bySector.get(sectorId);
    if (set === undefined) return;
    set.delete(charId);
    if (set.size === 0) {
      this.bySector.delete(sectorId);
    }
  }

  broadcast(sectorId: SectorId, _message: string): void {
    // TODO: Phase 3 — look up each char's connection in GameWorld and send.
    const subscribers = this.bySector.get(sectorId);
    if (subscribers === undefined) return;
    // no-op for now
  }
}
