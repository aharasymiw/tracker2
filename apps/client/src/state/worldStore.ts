import { create } from 'zustand';
import type { TileMap } from '@lod/game-core';
import type {
  StateSnapshotMessage,
  StateDeltaMessage,
} from '@lod/protocol';

/**
 * The subset of a `StateSnapshot` payload that actually drives the UI. The
 * wire shape is looser than this — we re-project it to narrower client views.
 */
export interface CharacterView {
  id: string;
  x: number;
  y: number;
  hp: number;
  hpMax: number;
  str: number;
  dex: number;
  agl: number;
  credits: number;
  turnsRemaining: number;
}

/** Minimal entity descriptor for anything near the player on the local map. */
export interface EntityView {
  id: string;
  kind: 'character' | 'enemy' | 'item' | 'npc' | 'fortress';
  x: number;
  y: number;
  hp?: number;
  hpMax?: number;
}

/** Payload bodies extracted from the protocol discriminated unions. */
export type StateSnapshotPayload = StateSnapshotMessage['payload'];
export type StateDeltaPayload = StateDeltaMessage['payload'];

export interface WorldState {
  character: CharacterView | null;
  nearbyEntities: Map<string, EntityView>;
  tileMap: TileMap | null;
  tickNumber: number;
  setCharacter(character: CharacterView | null): void;
  applySnapshot(snapshot: StateSnapshotPayload): void;
  applyDelta(delta: StateDeltaPayload): void;
  reset(): void;
}

function characterFromSnapshot(
  snapshot: StateSnapshotPayload,
): CharacterView {
  const { character } = snapshot;
  return {
    id: character.id,
    x: character.position.x,
    y: character.position.y,
    hp: character.hp,
    hpMax: character.hpMax,
    str: character.str,
    dex: character.dex,
    agl: character.agl,
    credits: character.credits,
    turnsRemaining: character.turnsRemaining,
  };
}

/**
 * Zustand store holding the live world state driven by the WebSocket gateway.
 * Snapshots replace state entirely; deltas patch HP values and remove
 * despawned entities. Movement deltas are loose in Phase 0-2 and will be
 * narrowed once the protocol entity shapes land.
 */
export const useWorldStore = create<WorldState>((set) => ({
  character: null,
  nearbyEntities: new Map<string, EntityView>(),
  tileMap: null,
  tickNumber: 0,
  setCharacter: (character) => set({ character }),
  applySnapshot: (snapshot) => {
    const character = characterFromSnapshot(snapshot);
    set({
      character,
      nearbyEntities: new Map<string, EntityView>(),
      tickNumber: 0,
    });
  },
  applyDelta: (delta) => {
    set((state) => {
      if (state.character === null) return state;
      const next = new Map(state.nearbyEntities);
      let character = state.character;
      for (const change of delta.hpChanges) {
        if (change.entityId === character.id) {
          character = { ...character, hp: change.hp };
          continue;
        }
        const existing = next.get(change.entityId);
        if (existing !== undefined) {
          next.set(change.entityId, { ...existing, hp: change.hp });
        }
      }
      for (const removed of delta.despawns) {
        next.delete(removed);
      }
      return {
        ...state,
        character,
        nearbyEntities: next,
        tickNumber: state.tickNumber + 1,
      };
    });
  },
  reset: () =>
    set({
      character: null,
      nearbyEntities: new Map<string, EntityView>(),
      tileMap: null,
      tickNumber: 0,
    }),
}));
