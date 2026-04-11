import { z } from 'zod';
import { combatEventSchema } from './combatMessages';

/**
 * Server -> Client events. All messages carry a `type` discriminator.
 *
 * NOTE: several payloads (StateSnapshot, StateDelta) are intentionally loose
 * for Phase 0-3; they will be tightened as game-core data models land.
 */

// ----- Small building blocks -----

export const serverChatChannelSchema = z.enum(['global', 'local', 'system']);
export type ServerChatChannel = z.infer<typeof serverChatChannelSchema>;

// A minimal character-state shape used inside StateSnapshot. TODO: expand
// alongside packages/game-core data models.
export const characterStateSchema = z.object({
  id: z.string().min(1),
  position: z.object({ x: z.number().int(), y: z.number().int() }),
  hp: z.number().int(),
  hpMax: z.number().int(),
  str: z.number().int(),
  dex: z.number().int(),
  agl: z.number().int(),
  credits: z.number().int().nonnegative(),
  turnsRemaining: z.number().int().nonnegative(),
});

// Inventory summary — TODO: replace with a real item shape once game-content lands.
export const inventorySummarySchema = z.object({
  slots: z.number().int().nonnegative(),
  used: z.number().int().nonnegative(),
  items: z.array(z.record(z.unknown())), // TODO(Phase 1): concrete item summaries
});

// A "nearby entity" entry. TODO: Phase 1 to refine into a discriminated union.
export const nearbyEntitySchema = z.record(z.unknown());

// ----- Variants -----

export const stateSnapshotSchema = z.object({
  type: z.literal('StateSnapshot'),
  payload: z.object({
    sectorId: z.string().min(1),
    tileMapId: z.string().min(1),
    character: characterStateSchema,
    inventory: inventorySummarySchema,
    // TODO(Phase 1): refine nearbyEntities once entity shapes are defined.
    nearbyEntities: z.array(nearbyEntitySchema),
  }),
});

export const stateDeltaSchema = z.object({
  type: z.literal('StateDelta'),
  payload: z.object({
    // TODO(Phase 1): tighten these records into named shapes.
    movedEntities: z.array(z.record(z.unknown())),
    hpChanges: z.array(
      z.object({
        entityId: z.string().min(1),
        hp: z.number().int(),
      }),
    ),
    spawns: z.array(z.record(z.unknown())),
    despawns: z.array(z.string().min(1)),
  }),
});

export const combatEventMessageSchema = z.object({
  type: z.literal('CombatEvent'),
  payload: combatEventSchema,
});

export const presenceUpdateSchema = z.object({
  type: z.literal('PresenceUpdate'),
  payload: z.object({
    entered: z.array(z.string().min(1)),
    left: z.array(z.string().min(1)),
  }),
});

export const chatMessageSchema = z.object({
  type: z.literal('ChatMessage'),
  payload: z.object({
    channel: serverChatChannelSchema,
    from: z.string().min(1),
    body: z.string().max(500),
    ts: z.number().int().nonnegative(),
  }),
});

export const mailDeliveredSchema = z.object({
  type: z.literal('MailDelivered'),
  payload: z.object({
    mailId: z.string().min(1),
    from: z.string().min(1),
    subject: z.string().max(200),
  }),
});

export const bulletinPostedSchema = z.object({
  type: z.literal('BulletinPosted'),
  payload: z.object({
    bulletinId: z.string().min(1),
    author: z.string().min(1),
    title: z.string().max(200),
  }),
});

export const errorMessageSchema = z.object({
  type: z.literal('Error'),
  payload: z.object({
    code: z.string().min(1),
    message: z.string().min(1),
  }),
});

// ----- Discriminated union -----

export const serverToClientMessageSchema = z.discriminatedUnion('type', [
  stateSnapshotSchema,
  stateDeltaSchema,
  combatEventMessageSchema,
  presenceUpdateSchema,
  chatMessageSchema,
  mailDeliveredSchema,
  bulletinPostedSchema,
  errorMessageSchema,
]);

export type ServerToClientMessage = z.infer<typeof serverToClientMessageSchema>;

// Individual variant types
export type StateSnapshotMessage = z.infer<typeof stateSnapshotSchema>;
export type StateDeltaMessage = z.infer<typeof stateDeltaSchema>;
export type CombatEventMessage = z.infer<typeof combatEventMessageSchema>;
export type PresenceUpdateMessage = z.infer<typeof presenceUpdateSchema>;
export type ChatMessageEvent = z.infer<typeof chatMessageSchema>;
export type MailDeliveredMessage = z.infer<typeof mailDeliveredSchema>;
export type BulletinPostedMessage = z.infer<typeof bulletinPostedSchema>;
export type ErrorMessageVariant = z.infer<typeof errorMessageSchema>;
