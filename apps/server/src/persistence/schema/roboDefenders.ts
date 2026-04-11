import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  uuid,
} from 'drizzle-orm/pg-core';
import { fortresses } from './fortresses.js';

export const roboDefenders = pgTable(
  'robo_defenders',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    fortressId: uuid('fortress_id')
      .notNull()
      .references(() => fortresses.id, { onDelete: 'cascade' }),
    model: text('model').notNull(),
    hp: integer('hp').notNull(),
    program: jsonb('program').notNull().default(sql`'{}'::jsonb`),
  },
  (table) => ({
    fortressIdx: index('robo_defenders_fortress_idx').on(table.fortressId),
  }),
);

export type RoboDefenderRow = typeof roboDefenders.$inferSelect;
export type NewRoboDefenderRow = typeof roboDefenders.$inferInsert;
