import { z } from 'zod';

/**
 * Weapon definition schema. The shape mirrors `WeaponDef` in `@lod/game-core`
 * and must stay in sync with it; the JSON data is the runtime source of truth.
 */
export const weaponSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  kind: z.enum(['close', 'long']),
  base: z.number().int().positive(),
  variance: z.number().int().nonnegative(),
  accuracy: z.number().min(-0.5).max(0.5),
  optimalRange: z.number().int().positive().optional(),
  buyPrice: z.number().int().nonnegative().nullable(),
  sellPrice: z.number().int().nonnegative().nullable(),
});

export type Weapon = z.infer<typeof weaponSchema>;
