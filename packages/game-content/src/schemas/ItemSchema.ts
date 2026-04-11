import { z } from 'zod';

/**
 * Schema for non-weapon, non-armor items (consumables, ammo, power cells, tools,
 * and key quest items such as Puritron parts).
 *
 * Must stay in sync with any canonical item typings defined in `@lod/game-core`.
 */
export const itemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  category: z.enum(['consumable', 'ammo', 'power_cell', 'tool', 'key_item']),
  stackable: z.boolean(),
  maxStack: z.number().int().positive().default(1),
  buyPrice: z.number().int().nonnegative().nullable(),
  sellPrice: z.number().int().nonnegative().nullable(),
  effects: z.record(z.unknown()).optional(),
});

export type Item = z.infer<typeof itemSchema>;
