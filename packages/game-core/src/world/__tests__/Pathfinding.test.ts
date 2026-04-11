import { describe, expect, it } from 'vitest';
import { TileMap, type TileKind } from '../TileMap';
import { findPath } from '../Pathfinding';

const F: TileKind = 'floor';
const W: TileKind = 'wall';

describe('findPath', () => {
  it('finds a direct path on an empty map', () => {
    const map = TileMap.fromGrid([
      [F, F, F],
      [F, F, F],
      [F, F, F],
    ]);
    const path = findPath(map, { x: 0, y: 0 }, { x: 2, y: 2 });
    expect(path).not.toBeNull();
    if (path === null) return;
    expect(path[0]).toEqual({ x: 0, y: 0 });
    expect(path[path.length - 1]).toEqual({ x: 2, y: 2 });
  });

  it('finds a path around a wall', () => {
    const map = TileMap.fromGrid([
      [F, F, F, F, F],
      [F, W, W, W, F],
      [F, F, F, F, F],
    ]);
    const path = findPath(map, { x: 0, y: 0 }, { x: 4, y: 0 });
    expect(path).not.toBeNull();
    if (path === null) return;
    // Every step must be passable.
    for (const p of path) {
      expect(map.isPassable(p.x, p.y)).toBe(true);
    }
  });

  it('returns null when the target is unreachable', () => {
    const map = TileMap.fromGrid([
      [F, W, F],
      [W, W, W],
      [F, W, F],
    ]);
    expect(findPath(map, { x: 0, y: 0 }, { x: 2, y: 2 })).toBeNull();
  });

  it('returns null if maxSteps is exhausted', () => {
    const map = TileMap.fromGrid([
      [F, F, F, F, F],
      [F, F, F, F, F],
      [F, F, F, F, F],
    ]);
    expect(findPath(map, { x: 0, y: 0 }, { x: 4, y: 2 }, 1)).toBeNull();
  });

  it('same-tile path is a trivial single-element result', () => {
    const map = TileMap.fromGrid([[F]]);
    const path = findPath(map, { x: 0, y: 0 }, { x: 0, y: 0 });
    expect(path).not.toBeNull();
    expect(path).toEqual([{ x: 0, y: 0 }]);
  });

  it('rejects a destination that is a wall', () => {
    const map = TileMap.fromGrid([
      [F, W],
      [F, F],
    ]);
    expect(findPath(map, { x: 0, y: 0 }, { x: 1, y: 0 })).toBeNull();
  });
});
