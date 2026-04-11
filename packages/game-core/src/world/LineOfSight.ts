import { abs } from '../math-utils';
import type { TileCoord } from '../types';
import type { TileMap } from './TileMap';

/**
 * Bresenham line-trace LOS check. Returns true iff every tile strictly
 * between `from` and `to` is non-opaque. The endpoints themselves are not
 * checked — the shooter and target tiles are always considered "clear" for
 * the purposes of LOS, matching the usual roguelike convention where you can
 * shoot out of (or into) a tile with a wall slot.
 *
 * If `from` and `to` are the same tile, we return `true` trivially.
 */
export function hasLineOfSight(
  map: TileMap,
  from: TileCoord,
  to: TileCoord,
): boolean {
  if (from.x === to.x && from.y === to.y) return true;

  let x0 = from.x;
  let y0 = from.y;
  const x1 = to.x;
  const y1 = to.y;

  const dx = abs(x1 - x0);
  const dy = -abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let error = dx + dy;

  // Walk the Bresenham line. Skip the starting tile (shooter) and stop just
  // before stepping onto the target tile; any opaque tile in between breaks
  // the line.
  while (true) {
    const nextError = 2 * error;
    if (nextError >= dy) {
      if (x0 === x1) break;
      error += dy;
      x0 += sx;
    }
    if (nextError <= dx) {
      if (y0 === y1) break;
      error += dx;
      y0 += sy;
    }
    if (x0 === x1 && y0 === y1) break;
    if (map.isOpaque(x0, y0)) return false;
  }

  return true;
}
