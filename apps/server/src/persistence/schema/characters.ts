import { sql } from 'drizzle-orm';
import {
  bigint,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from './users.js';

/**
 * Characters table. Soft-delete only (never hard delete a character;
 * dispute resolution depends on history being preserved).
 */
export const characters = pgTable(
  'characters',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    characterClass: text('character_class').notNull().default('wanderer'),
    level: integer('level').notNull().default(1),
    xp: integer('xp').notNull().default(0),
    str: integer('str').notNull().default(10),
    dex: integer('dex').notNull().default(10),
    agl: integer('agl').notNull().default(10),
    hpMax: integer('hp_max').notNull().default(50),
    hpCurrent: integer('hp_current').notNull().default(50),
    credits: bigint('credits', { mode: 'bigint' }).notNull().default(0n),
    sectorId: text('sector_id').notNull().default('sacre-base'),
    tileX: integer('tile_x').notNull().default(0),
    tileY: integer('tile_y').notNull().default(0),
    turnsRemaining: integer('turns_remaining').notNull().default(150),
    lastTurnResetAt: timestamp('last_turn_reset_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    nameUnique: uniqueIndex('characters_name_unique')
      .on(table.name)
      .where(sql`${table.deletedAt} is null`),
    userIdx: index('characters_user_idx').on(table.userId),
    positionIdx: index('characters_position_idx').on(
      table.sectorId,
      table.tileX,
      table.tileY,
    ),
  }),
);

export type CharacterRow = typeof characters.$inferSelect;
export type NewCharacterRow = typeof characters.$inferInsert;
