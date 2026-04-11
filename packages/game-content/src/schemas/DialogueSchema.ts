import { z } from 'zod';

/**
 * Dialogue tree schema. Each NPC's conversation is a map of node id -> node.
 * Choices reference another node id or `null` to exit the conversation.
 * Actions are opaque hints the game layer interprets (buy, train, give quest).
 */
export interface DialogueNode {
  id: string;
  text: string;
  choices: {
    label: string;
    next: string | null;
    action?: {
      kind: 'buy' | 'sell' | 'train' | 'quest' | 'rumor' | 'exit';
      payload?: Record<string, unknown>;
    };
  }[];
}

export const dialogueNodeSchema: z.ZodType<DialogueNode> = z.lazy(() =>
  z.object({
    id: z.string(),
    text: z.string(),
    choices: z.array(
      z.object({
        label: z.string(),
        next: z.string().nullable(),
        action: z
          .object({
            kind: z.enum(['buy', 'sell', 'train', 'quest', 'rumor', 'exit']),
            payload: z.record(z.unknown()).optional(),
          })
          .optional(),
      }),
    ),
  }),
);

export const dialogueTreeSchema = z.record(dialogueNodeSchema);

export type DialogueTree = z.infer<typeof dialogueTreeSchema>;
