import type { Result } from '@lod/shared-utils';
import { err, ok } from '@lod/shared-utils';
import type { Direction, TileCoord } from '../types';
import type { TileMap } from './TileMap';

/** Intent form used by the server's intent queue. */
export type MoveIntent = { from: TileCoord; direction: Direction };

/**
 * Convert an 8-directional move into its delta vector. We use screen-space
 * conventions: +x is east, +y is south. `N` therefore decrements `y`.
 */
export function directionToDelta(direction: Direction): {
  dx: number;
  dy: number;
} {
  switch (direction) {
    case 'N':
      return { dx: 0, dy: -1 };
    case 'S':
      return { dx: 0, dy: 1 };
    case 'E':
      return { dx: 1, dy: 0 };
    case 'W':
      return { dx: -1, dy: 0 };
    case 'NE':
      return { dx: 1, dy: -1 };
    case 'NW':
      return { dx: -1, dy: -1 };
    case 'SE':
      return { dx: 1, dy: 1 };
    case 'SW':
      return { dx: -1, dy: 1 };
  }
}

/**
 * Apply a single-step move against a tile map. Returns the new coordinate on
 * success, or an error reason on failure. This is the only place the core
 * sim decides "can I move here?" — the server intent handler calls this and
 * rejects the intent if it returns `Err`.
 */
export function applyMove(
  map: TileMap,
  from: TileCoord,
  direction: Direction,
): Result<TileCoord, 'blocked' | 'out_of_bounds'> {
  const { dx, dy } = directionToDelta(direction);
  const next: TileCoord = { x: from.x + dx, y: from.y + dy };
  if (!map.inBounds(next.x, next.y)) {
    return err('out_of_bounds');
  }
  if (!map.isPassable(next.x, next.y)) {
    return err('blocked');
  }
  return ok(next);
}
