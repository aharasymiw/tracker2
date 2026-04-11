import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { characters } from './characters.js';

export const mail = pgTable(
  'mail',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    fromCharacterId: uuid('from_character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    toCharacterId: uuid('to_character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    subject: text('subject').notNull(),
    body: text('body').notNull(),
    sentAt: timestamp('sent_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    readAt: timestamp('read_at', { withTimezone: true }),
    attachments: jsonb('attachments').notNull().default(sql`'[]'::jsonb`),
  },
  (table) => ({
    toIdx: index('mail_to_idx').on(table.toCharacterId),
    fromIdx: index('mail_from_idx').on(table.fromCharacterId),
  }),
);

export type MailRow = typeof mail.$inferSelect;
export type NewMailRow = typeof mail.$inferInsert;
