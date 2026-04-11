import { describe, expect, it } from 'vitest';
import { TileMap, type TileKind } from '../TileMap';
import { hasLineOfSight } from '../LineOfSight';

const F: TileKind = 'floor';
const W: TileKind = 'wall';

describe('hasLineOfSight', () => {
  it('clear corridor yields true', () => {
    const map = TileMap.fromGrid([
      [F, F, F, F, F],
      [F, F, F, F, F],
      [F, F, F, F, F],
    ]);
    expect(hasLineOfSight(map, { x: 0, y: 1 }, { x: 4, y: 1 })).toBe(true);
  });

  it('wall in the middle blocks LOS', () => {
    const map = TileMap.fromGrid([
      [F, F, F, F, F],
      [F, F, W, F, F],
      [F, F, F, F, F],
    ]);
    expect(hasLineOfSight(map, { x: 0, y: 1 }, { x: 4, y: 1 })).toBe(false);
  });

  it('same tile is trivially visible', () => {
    const map = TileMap.fromGrid([[F]]);
    expect(hasLineOfSight(map, { x: 0, y: 0 }, { x: 0, y: 0 })).toBe(true);
  });

  it('diagonal clear line succeeds', () => {
    const map = TileMap.fromGrid([
      [F, F, F],
      [F, F, F],
      [F, F, F],
    ]);
    expect(hasLineOfSight(map, { x: 0, y: 0 }, { x: 2, y: 2 })).toBe(true);
  });

  it('endpoints are not checked for opacity', () => {
    // Shooter or target being opaque is allowed — we only gate on tiles strictly between.
    const map = TileMap.fromGrid([
      [W, F, F],
      [F, F, F],
      [F, F, W],
    ]);
    expect(hasLineOfSight(map, { x: 0, y: 0 }, { x: 2, y: 2 })).toBe(true);
  });
});
