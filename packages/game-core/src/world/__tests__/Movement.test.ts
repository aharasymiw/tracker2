import { describe, expect, it } from 'vitest';
import { TileMap, type TileKind } from '../TileMap';
import { applyMove, directionToDelta } from '../Movement';
import type { Direction } from '../../types';
import { abs } from '../../math-utils';

const F: TileKind = 'floor';
const W: TileKind = 'wall';

const buildMap = (): TileMap =>
  TileMap.fromGrid([
    [F, F, F],
    [F, W, F],
    [F, F, F],
  ]);

describe('directionToDelta', () => {
  it('produces unit vectors for all 8 directions', () => {
    const directions: Direction[] = ['N', 'S', 'E', 'W', 'NE', 'NW', 'SE', 'SW'];
    for (const dir of directions) {
      const { dx, dy } = directionToDelta(dir);
      expect(abs(dx) + abs(dy)).toBeGreaterThanOrEqual(1);
      expect(abs(dx)).toBeLessThanOrEqual(1);
      expect(abs(dy)).toBeLessThanOrEqual(1);
    }
  });
});

describe('applyMove', () => {
  const map = buildMap();

  it('moves into a passable tile', () => {
    const r = applyMove(map, { x: 0, y: 0 }, 'E');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).toEqual({ x: 1, y: 0 });
  });

  it('rejects a move into a wall', () => {
    const r = applyMove(map, { x: 0, y: 1 }, 'E');
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe('blocked');
  });

  it('rejects a move out of bounds', () => {
    const r = applyMove(map, { x: 0, y: 0 }, 'NW');
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe('out_of_bounds');
  });

  it('supports diagonal movement', () => {
    const r = applyMove(map, { x: 0, y: 0 }, 'SE');
    expect(r.ok).toBe(false); // (1,1) is a wall
  });

  it('all 8 directions resolved from center', () => {
    const center = { x: 1, y: 1 };
    // Center is a wall in our test map; use a pure floor map for this.
    const floorMap = TileMap.fromGrid([
      [F, F, F],
      [F, F, F],
      [F, F, F],
    ]);
    const dirs: Direction[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    for (const d of dirs) {
      const r = applyMove(floorMap, center, d);
      expect(r.ok).toBe(true);
    }
  });
});
