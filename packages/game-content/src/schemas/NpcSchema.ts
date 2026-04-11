import { z } from 'zod';

/**
 * NPC schema. `dialogueKey` names the top-level entry in `dialogue.json` that
 * stores this NPC's dialogue tree. `shopStock` is only meaningful for
 * shopkeepers and names item ids the merchant will sell.
 */
export const npcSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  role: z.enum(['shopkeeper', 'trainer', 'quest_giver', 'banker', 'doctor', 'flavor']),
  dialogueKey: z.string(),
  sectorId: z.string(),
  position: z.object({ x: z.number().int(), y: z.number().int() }),
  shopStock: z.array(z.string()).optional(),
});

export type Npc = z.infer<typeof npcSchema>;
