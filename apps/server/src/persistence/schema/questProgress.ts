import {
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { characters } from './characters.js';

/**
 * Quest progress. Composite primary key on (character_id, quest_id) — one
 * progress row per quest per character.
 */
export const questProgress = pgTable(
  'quest_progress',
  {
    characterId: uuid('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    questId: text('quest_id').notNull(),
    status: text('status').notNull().default('inactive'),
    step: integer('step').notNull().default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.characterId, table.questId] }),
  }),
);

export type QuestProgressRow = typeof questProgress.$inferSelect;
export type NewQuestProgressRow = typeof questProgress.$inferInsert;
