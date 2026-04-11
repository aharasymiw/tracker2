import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { characters } from './characters.js';
import { combatSessions } from './combatSessions.js';

/**
 * Fortresses table. `raid_session_id` FK to combat_sessions is used with
 * SELECT FOR UPDATE when starting a raid, so only one raid per fortress at
 * a time is possible. Soft-delete only.
 */
export const fortresses = pgTable(
  'fortresses',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    ownerCharacterId: uuid('owner_character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    sectorId: text('sector_id').notNull(),
    tileX: integer('tile_x').notNull(),
    tileY: integer('tile_y').notNull(),
    defenseField: integer('defense_field').notNull().default(0),
    wallHp: integer('wall_hp').notNull().default(100),
    tollCredits: integer('toll_credits').notNull().default(0),
    raidSessionId: uuid('raid_session_id').references(() => combatSessions.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    positionIdx: index('fortresses_position_idx').on(
      table.sectorId,
      table.tileX,
      table.tileY,
    ),
    ownerIdx: index('fortresses_owner_idx').on(table.ownerCharacterId),
  }),
);

export type FortressRow = typeof fortresses.$inferSelect;
export type NewFortressRow = typeof fortresses.$inferInsert;
