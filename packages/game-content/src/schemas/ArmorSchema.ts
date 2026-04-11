import { z } from 'zod';

/**
 * Armor definition schema. Mirrors `ArmorDef` in `@lod/game-core` — keep in sync.
 * `soak` is the flat damage reduction against close-combat hits; `soakLong`
 * reduces long-range hits (armor is generally less effective at range).
 */
export const armorSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  soak: z.number().int().nonnegative(),
  soakLong: z.number().int().nonnegative(),
  buyPrice: z.number().int().nonnegative().nullable(),
  sellPrice: z.number().int().nonnegative().nullable(),
});

export type Armor = z.infer<typeof armorSchema>;
