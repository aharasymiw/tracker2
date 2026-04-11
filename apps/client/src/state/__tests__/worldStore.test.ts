import { describe, it, expect, beforeEach } from 'vitest';
import { useWorldStore, type StateSnapshotPayload } from '../worldStore';

function makeSnapshot(overrides: Partial<{ hp: number; hpMax: number }> = {}): StateSnapshotPayload {
  return {
    sectorId: 'sector-1',
    tileMapId: 'map-1',
    character: {
      id: 'char-1',
      position: { x: 2, y: 3 },
      hp: overrides.hp ?? 50,
      hpMax: overrides.hpMax ?? 50,
      str: 10,
      dex: 10,
      agl: 10,
      credits: 250,
      turnsRemaining: 100,
    },
    inventory: { slots: 10, used: 0, items: [] },
    nearbyEntities: [],
  };
}

describe('worldStore', () => {
  beforeEach(() => {
    useWorldStore.getState().reset();
  });

  it('starts empty', () => {
    const state = useWorldStore.getState();
    expect(state.character).toBeNull();
    expect(state.nearbyEntities.size).toBe(0);
    expect(state.tickNumber).toBe(0);
  });

  it('applies a snapshot and projects the character view', () => {
    useWorldStore.getState().applySnapshot(makeSnapshot());
    const state = useWorldStore.getState();
    expect(state.character).not.toBeNull();
    expect(state.character?.id).toBe('char-1');
    expect(state.character?.x).toBe(2);
    expect(state.character?.y).toBe(3);
    expect(state.character?.hp).toBe(50);
  });

  it('applies hp deltas to the character', () => {
    useWorldStore.getState().applySnapshot(makeSnapshot());
    useWorldStore.getState().applyDelta({
      movedEntities: [],
      hpChanges: [{ entityId: 'char-1', hp: 21 }],
      spawns: [],
      despawns: [],
    });
    const state = useWorldStore.getState();
    expect(state.character?.hp).toBe(21);
    expect(state.tickNumber).toBe(1);
  });

  it('removes despawned entities from the nearby map', () => {
    useWorldStore.getState().applySnapshot(makeSnapshot());
    // Manually seed one entity
    useWorldStore.setState((prev) => {
      const next = new Map(prev.nearbyEntities);
      next.set('enemy-1', { id: 'enemy-1', kind: 'enemy', x: 5, y: 5, hp: 10, hpMax: 10 });
      return { nearbyEntities: next };
    });
    expect(useWorldStore.getState().nearbyEntities.has('enemy-1')).toBe(true);
    useWorldStore.getState().applyDelta({
      movedEntities: [],
      hpChanges: [],
      spawns: [],
      despawns: ['enemy-1'],
    });
    expect(useWorldStore.getState().nearbyEntities.has('enemy-1')).toBe(false);
  });

  it('setCharacter overrides the current projection', () => {
    useWorldStore.getState().setCharacter({
      id: 'manual',
      x: 0,
      y: 0,
      hp: 10,
      hpMax: 10,
      str: 1,
      dex: 1,
      agl: 1,
      credits: 0,
      turnsRemaining: 0,
    });
    expect(useWorldStore.getState().character?.id).toBe('manual');
  });
});
