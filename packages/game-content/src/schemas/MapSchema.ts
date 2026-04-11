import { z } from 'zod';

/**
 * Tile map schema. `tiles` is a flat row-major array of length width*height.
 * The `tileKindEnum` must stay in sync with `TileKind` in `@lod/game-core`.
 */
export const tileKindEnum = z.enum([
  'floor',
  'wall',
  'door',
  'water',
  'rough',
  'sacre_base_entry',
]);

export type TileKind = z.infer<typeof tileKindEnum>;

export const spawnSchema = z.object({
  x: z.number().int(),
  y: z.number().int(),
  kind: z.enum(['player_start', 'npc', 'enemy', 'item']),
  refId: z.string().optional(),
});

export const exitSchema = z.object({
  x: z.number().int(),
  y: z.number().int(),
  toMapId: z.string(),
  toX: z.number().int(),
  toY: z.number().int(),
});

export const mapSchema = z
  .object({
    id: z.string().min(1),
    name: z.string(),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    sectorId: z.string(),
    tiles: z.array(tileKindEnum),
    spawns: z.array(spawnSchema),
    exits: z.array(exitSchema),
  })
  .refine((m) => m.tiles.length === m.width * m.height, {
    message: 'tiles length must equal width * height',
  });

export type MapDef = z.infer<typeof mapSchema>;
