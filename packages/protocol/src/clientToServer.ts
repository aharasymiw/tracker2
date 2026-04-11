import { z } from 'zod';

/**
 * Client -> Server intents. All messages carry a `type` discriminator. Zod
 * validates shape; semantic authorization lives in apps/server/src/game/authz.ts
 * and must be checked *after* Zod parsing succeeds.
 */

// ----- Shared enums -----

export const directionSchema = z.enum(['N', 'S', 'E', 'W', 'NE', 'NW', 'SE', 'SW']);
export type Direction = z.infer<typeof directionSchema>;

export const trainableStatSchema = z.enum(['STR', 'DEX', 'AGL', 'HP']);
export type TrainableStat = z.infer<typeof trainableStatSchema>;

export const interactTargetKindSchema = z.enum(['npc', 'item', 'fortress', 'door']);
export type InteractTargetKind = z.infer<typeof interactTargetKindSchema>;

export const chatChannelSchema = z.enum(['global', 'local']);
export type ChatChannel = z.infer<typeof chatChannelSchema>;

// ----- Variants -----

export const moveSchema = z.object({
  type: z.literal('Move'),
  direction: directionSchema,
});

export const interactSchema = z.object({
  type: z.literal('Interact'),
  targetKind: interactTargetKindSchema,
  targetId: z.string().min(1),
});

export const attackLongRangeSchema = z.object({
  type: z.literal('AttackLongRange'),
  targetId: z.string().min(1),
  weaponId: z.string().min(1),
});

export const attackCloseSchema = z.object({
  type: z.literal('AttackClose'),
  targetId: z.string().min(1),
  weaponId: z.string().min(1),
});

export const useItemSchema = z.object({
  type: z.literal('UseItem'),
  itemId: z.string().min(1),
  targetId: z.string().min(1).optional(),
});

export const fleeSchema = z.object({
  type: z.literal('Flee'),
});

export const chatSchema = z.object({
  type: z.literal('Chat'),
  channel: chatChannelSchema,
  body: z.string().min(1).max(500),
});

export const tradeOfferSchema = z.object({
  type: z.literal('TradeOffer'),
  toCharacterId: z.string().min(1),
  itemIds: z.array(z.string().min(1)).max(256),
  credits: z.number().int().nonnegative(),
});

export const tradeAcceptSchema = z.object({
  type: z.literal('TradeAccept'),
  tradeId: z.string().min(1),
});

export const tradeCancelSchema = z.object({
  type: z.literal('TradeCancel'),
  tradeId: z.string().min(1),
});

export const raidDeclareSchema = z.object({
  type: z.literal('RaidDeclare'),
  fortressId: z.string().min(1),
});

export const trainStatSchema = z.object({
  type: z.literal('TrainStat'),
  stat: trainableStatSchema,
  points: z.number().int().positive(),
});

export const sellStatPointsSchema = z.object({
  type: z.literal('SellStatPoints'),
  stat: trainableStatSchema,
  points: z.number().int().positive(),
});

// ----- Discriminated union -----

export const clientToServerMessageSchema = z.discriminatedUnion('type', [
  moveSchema,
  interactSchema,
  attackLongRangeSchema,
  attackCloseSchema,
  useItemSchema,
  fleeSchema,
  chatSchema,
  tradeOfferSchema,
  tradeAcceptSchema,
  tradeCancelSchema,
  raidDeclareSchema,
  trainStatSchema,
  sellStatPointsSchema,
]);

export type ClientToServerMessage = z.infer<typeof clientToServerMessageSchema>;

// ----- Individual variant types -----

export type MoveMessage = z.infer<typeof moveSchema>;
export type InteractMessage = z.infer<typeof interactSchema>;
export type AttackLongRangeMessage = z.infer<typeof attackLongRangeSchema>;
export type AttackCloseMessage = z.infer<typeof attackCloseSchema>;
export type UseItemMessage = z.infer<typeof useItemSchema>;
export type FleeMessage = z.infer<typeof fleeSchema>;
export type ChatClientMessage = z.infer<typeof chatSchema>;
export type TradeOfferMessage = z.infer<typeof tradeOfferSchema>;
export type TradeAcceptMessage = z.infer<typeof tradeAcceptSchema>;
export type TradeCancelMessage = z.infer<typeof tradeCancelSchema>;
export type RaidDeclareMessage = z.infer<typeof raidDeclareSchema>;
export type TrainStatMessage = z.infer<typeof trainStatSchema>;
export type SellStatPointsMessage = z.infer<typeof sellStatPointsSchema>;
