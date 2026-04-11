import { sql } from 'drizzle-orm';
import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { characters } from './characters.js';

export const bulletins = pgTable(
  'bulletins',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    category: text('category').notNull(),
    authorCharacterId: uuid('author_character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    body: text('body').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    categoryIdx: index('bulletins_category_idx').on(
      table.category,
      table.createdAt,
    ),
  }),
);

export type BulletinRow = typeof bulletins.$inferSelect;
export type NewBulletinRow = typeof bulletins.$inferInsert;
