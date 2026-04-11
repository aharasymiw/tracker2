import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

/**
 * Combat sessions. The full `CombatSessionState` (including sealed PRNG
 * state) is serialized to JSONB so sessions can rehydrate on server restart.
 *
 * NEVER include raw PRNG seeds in log lines — see logger.ts redactions.
 */
export const combatSessions = pgTable(
  'combat_sessions',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    state: jsonb('state').notNull(),
    phase: text('phase').notNull(),
    round: integer('round').notNull().default(0),
    tileX: integer('tile_x').notNull(),
    tileY: integer('tile_y').notNull(),
    turnDeadlineAt: timestamp('turn_deadline_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    outcome: text('outcome'),
  },
  (table) => ({
    activeIdx: index('combat_sessions_active_idx')
      .on(table.endedAt)
      .where(sql`${table.endedAt} is null`),
  }),
);

export type CombatSessionRow = typeof combatSessions.$inferSelect;
export type NewCombatSessionRow = typeof combatSessions.$inferInsert;
