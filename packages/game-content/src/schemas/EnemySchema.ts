import { z } from 'zod';

/**
 * Enemy (mutant) definition schema. Weapon and armor references are plain ids
 * resolved by the loader against `weapons.json` / `armor.json`. Loot tables are
 * evaluated at kill time by `game-core` using `@lod/game-rng`.
 */
export const enemySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  tier: z.number().int().min(1).max(10),
  stats: z.object({
    str: z.number().int(),
    dex: z.number().int(),
    agl: z.number().int(),
    hpMax: z.number().int().positive(),
  }),
  weaponClose: z.string().optional(),
  weaponLong: z.string().optional(),
  armor: z.string().optional(),
  lootTable: z.array(
    z.object({
      itemId: z.string(),
      chance: z.number().min(0).max(1),
      qty: z.tuple([z.number().int(), z.number().int()]),
    }),
  ),
  xpReward: z.number().int().positive(),
  creditsReward: z.tuple([z.number().int(), z.number().int()]),
});

export type Enemy = z.infer<typeof enemySchema>;
