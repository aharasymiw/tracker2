import { SQRT2, manhattanDistance } from '../math-utils';
import type { TileCoord } from '../types';
import { neighborOffsets8, type TileMap } from './TileMap';

/**
 * A* pathfinder over the tile grid. Returns the full path including both
 * endpoints, or `null` if no route exists (or if `maxSteps` is exceeded).
 *
 * - 8-neighbor expansion: diagonals allowed.
 * - Cost: cardinal moves pay `movementCost`, diagonals pay `movementCost *
 *   sqrt(2)` so we don't prefer diagonal zigzags over straight lines.
 * - Heuristic: Manhattan distance. This is admissible for 4-neighbor grids
 *   and slightly inadmissible for 8-neighbor ones, which biases toward
 *   greedier but still sensible paths — fine for NPC navigation.
 *
 * The `maxSteps` parameter caps the number of nodes we pop from the open
 * set, not the path length. It's a safety valve to prevent runaway searches
 * on large maps where the destination is unreachable.
 */
export function findPath(
  map: TileMap,
  from: TileCoord,
  to: TileCoord,
  maxSteps: number = 10_000,
): TileCoord[] | null {
  if (!map.inBounds(from.x, from.y) || !map.inBounds(to.x, to.y)) {
    return null;
  }
  if (from.x === to.x && from.y === to.y) {
    return [{ ...from }];
  }
  if (!map.isPassable(to.x, to.y)) {
    return null;
  }

  // Use string keys for the closed-set and cameFrom maps; the grid is small
  // enough that string hashing beats allocating Int32Arrays for clarity.
  const key = (x: number, y: number): string => `${x},${y}`;

  // Open set: a simple sorted insertion — the maps we navigate are tiny
  // enough that a true binary heap is not worth the code weight.
  interface OpenNode {
    x: number;
    y: number;
    g: number;
    f: number;
  }
  const open: OpenNode[] = [
    { x: from.x, y: from.y, g: 0, f: manhattanDistance(from, to) },
  ];

  const cameFrom = new Map<string, string>();
  const gScore = new Map<string, number>();
  gScore.set(key(from.x, from.y), 0);

  let steps = 0;
  while (open.length > 0) {
    steps += 1;
    if (steps > maxSteps) return null;

    // Pop the node with the lowest f-score.
    let bestIndex = 0;
    for (let i = 1; i < open.length; i += 1) {
      const entry = open[i];
      const best = open[bestIndex];
      if (entry !== undefined && best !== undefined && entry.f < best.f) {
        bestIndex = i;
      }
    }
    const current = open[bestIndex];
    if (current === undefined) return null;
    open.splice(bestIndex, 1);

    if (current.x === to.x && current.y === to.y) {
      // Reconstruct the path backwards.
      const path: TileCoord[] = [{ x: current.x, y: current.y }];
      let cursor = key(current.x, current.y);
      while (cameFrom.has(cursor)) {
        const prev = cameFrom.get(cursor);
        if (prev === undefined) break;
        const [px, py] = prev.split(',').map((v) => Number(v));
        if (px === undefined || py === undefined) break;
        path.push({ x: px, y: py });
        cursor = prev;
      }
      path.reverse();
      return path;
    }

    for (const offset of neighborOffsets8) {
      const dx = offset[0];
      const dy = offset[1];
      if (dx === undefined || dy === undefined) continue;
      const nx = current.x + dx;
      const ny = current.y + dy;
      if (!map.inBounds(nx, ny)) continue;
      const tile = map.at(nx, ny);
      if (tile === undefined || !tile.passable) continue;

      const isDiagonal = dx !== 0 && dy !== 0;
      const stepCost = tile.movementCost * (isDiagonal ? SQRT2 : 1);
      const tentativeG = current.g + stepCost;
      const nKey = key(nx, ny);
      const prevG = gScore.get(nKey);
      if (prevG !== undefined && tentativeG >= prevG) continue;

      cameFrom.set(nKey, key(current.x, current.y));
      gScore.set(nKey, tentativeG);
      const f = tentativeG + manhattanDistance({ x: nx, y: ny }, to);
      open.push({ x: nx, y: ny, g: tentativeG, f });
    }
  }

  return null;
}
