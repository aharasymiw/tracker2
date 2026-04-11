import type { TileCoord } from '../types';

/**
 * Base tile kinds used by game-core for pathfinding, LOS, and movement
 * validation. Content-layer tile variants (decor tiles, animated tiles) map
 * down to one of these kinds via `game-content`.
 */
export type TileKind =
  | 'floor'
  | 'wall'
  | 'door'
  | 'water'
  | 'rough'
  | 'sacre_base_entry';

/**
 * A fully-expanded tile definition. `passable` controls whether a combatant
 * can enter, `opaque` controls line-of-sight, `movementCost` feeds A*.
 */
export interface Tile {
  kind: TileKind;
  passable: boolean;
  opaque: boolean;
  movementCost: number;
}

/**
 * Canonical tile definitions. Keep the entries minimal — if a tile needs more
 * complex behavior it probably belongs in `game-content` as a content tile
 * that references one of these kinds as a base.
 *
 * - `floor`: open, passable, cheap.
 * - `wall`: impassable + opaque — blocks LOS and movement.
 * - `door`: passable but blocks LOS until opened (we treat closed by default).
 * - `water`: impassable (no swimming in the wasteland). Not opaque.
 * - `rough`: passable but double movement cost — ruins, rubble.
 * - `sacre_base_entry`: passable floor marker used by the sector loader to
 *   place characters returning from the wasteland.
 */
export const TILE_DEFS: Record<TileKind, Tile> = {
  floor: { kind: 'floor', passable: true, opaque: false, movementCost: 1 },
  wall: { kind: 'wall', passable: false, opaque: true, movementCost: 0 },
  door: { kind: 'door', passable: true, opaque: true, movementCost: 1 },
  water: { kind: 'water', passable: false, opaque: false, movementCost: 0 },
  rough: { kind: 'rough', passable: true, opaque: false, movementCost: 2 },
  sacre_base_entry: {
    kind: 'sacre_base_entry',
    passable: true,
    opaque: false,
    movementCost: 1,
  },
};

/**
 * Immutable tile grid. Indexed row-major: `tiles[y * width + x]`. Constructor
 * is intentionally tolerant of out-of-bounds queries — they return
 * `undefined` rather than throwing so pathfinding and LOS can treat the map
 * edges naturally.
 */
export class TileMap {
  constructor(
    public readonly width: number,
    public readonly height: number,
    private readonly tiles: readonly Tile[],
  ) {
    if (tiles.length !== width * height) {
      throw new Error(
        `TileMap: tile count ${tiles.length} does not match ${width}x${height}`,
      );
    }
  }

  /** Return the tile at `(x, y)`, or `undefined` if out of bounds. */
  at(x: number, y: number): Tile | undefined {
    if (!this.inBounds(x, y)) return undefined;
    return this.tiles[y * this.width + x];
  }

  /** Bounds check helper. */
  inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  /** Passable for movement? Out-of-bounds counts as impassable. */
  isPassable(x: number, y: number): boolean {
    const tile = this.at(x, y);
    return tile !== undefined && tile.passable;
  }

  /** Blocks LOS? Out-of-bounds counts as opaque so LOS can't escape the map. */
  isOpaque(x: number, y: number): boolean {
    const tile = this.at(x, y);
    return tile === undefined || tile.opaque;
  }

  /**
   * Build a map from a 2D grid of `TileKind`s. The outer array is rows
   * (y-axis), each row is a list of kinds (x-axis). All rows must be the
   * same length.
   */
  static fromGrid(grid: readonly (readonly TileKind[])[]): TileMap {
    const height = grid.length;
    if (height === 0) {
      return new TileMap(0, 0, []);
    }
    const firstRow = grid[0];
    if (firstRow === undefined) {
      return new TileMap(0, 0, []);
    }
    const width = firstRow.length;
    const tiles: Tile[] = [];
    for (let y = 0; y < height; y += 1) {
      const row = grid[y];
      if (row === undefined || row.length !== width) {
        throw new Error(`TileMap.fromGrid: row ${y} length mismatch`);
      }
      for (let x = 0; x < width; x += 1) {
        const kind = row[x];
        if (kind === undefined) {
          throw new Error(`TileMap.fromGrid: missing tile at (${x}, ${y})`);
        }
        tiles.push(TILE_DEFS[kind]);
      }
    }
    return new TileMap(width, height, tiles);
  }
}

/** Helper for iterating grid neighbors — handy for visibility and AI code. */
export const neighborOffsets8: readonly (readonly [number, number])[] = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
];

/** Typed helper: is `p` inside the map? */
export const coordInMap = (map: TileMap, p: TileCoord): boolean =>
  map.inBounds(p.x, p.y);
