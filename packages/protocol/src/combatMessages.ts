import { z } from 'zod';

/**
 * Combat event variants streamed as Server -> Client `CombatEvent` messages.
 * All fields reference entities by opaque string IDs; the client never sees
 * raw PRNG state or server-side combat seeds.
 */

const baseCombatFields = {
  actorId: z.string().min(1),
  targetId: z.string().min(1).optional(),
  amount: z.number().int().nonnegative().optional(),
  weaponId: z.string().min(1).optional(),
};

export const combatPhaseTransitionSchema = z.object({
  kind: z.literal('phase-transition'),
  phase: z.enum(['long-range', 'close', 'ended']),
  ...baseCombatFields,
});

export const combatHitSchema = z.object({
  kind: z.literal('hit'),
  ...baseCombatFields,
});

export const combatMissSchema = z.object({
  kind: z.literal('miss'),
  ...baseCombatFields,
});

export const combatCritSchema = z.object({
  kind: z.literal('crit'),
  ...baseCombatFields,
});

export const combatDamageSchema = z.object({
  kind: z.literal('damage'),
  ...baseCombatFields,
});

export const combatHealSchema = z.object({
  kind: z.literal('heal'),
  ...baseCombatFields,
});

export const combatFleeSuccessSchema = z.object({
  kind: z.literal('flee-success'),
  ...baseCombatFields,
});

export const combatFleeFailSchema = z.object({
  kind: z.literal('flee-fail'),
  ...baseCombatFields,
});

export const combatDefeatSchema = z.object({
  kind: z.literal('defeat'),
  ...baseCombatFields,
});

export const combatVictorySchema = z.object({
  kind: z.literal('victory'),
  ...baseCombatFields,
});

export const combatEventSchema = z.discriminatedUnion('kind', [
  combatPhaseTransitionSchema,
  combatHitSchema,
  combatMissSchema,
  combatCritSchema,
  combatDamageSchema,
  combatHealSchema,
  combatFleeSuccessSchema,
  combatFleeFailSchema,
  combatDefeatSchema,
  combatVictorySchema,
]);

export type CombatEvent = z.infer<typeof combatEventSchema>;
