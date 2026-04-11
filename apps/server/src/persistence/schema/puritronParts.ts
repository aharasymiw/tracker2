import { sql } from 'drizzle-orm';
import {
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { characters } from './characters.js';

/**
 * Puritron parts. Collecting all parts is the win condition for a character.
 * `part_index` is unique — there are a fixed number of parts in the world.
 */
export const puritronParts = pgTable(
  'puritron_parts',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    partIndex: integer('part_index').notNull(),
    heldByCharacterId: uuid('held_by_character_id').references(
      () => characters.id,
      { onDelete: 'set null' },
    ),
    inSectorId: text('in_sector_id'),
    inTileX: integer('in_tile_x'),
    inTileY: integer('in_tile_y'),
    returnedToBaseAt: timestamp('returned_to_base_at', { withTimezone: true }),
  },
  (table) => ({
    partIndexUnique: uniqueIndex('puritron_parts_part_index_unique').on(
      table.partIndex,
    ),
  }),
);

export type PuritronPartRow = typeof puritronParts.$inferSelect;
export type NewPuritronPartRow = typeof puritronParts.$inferInsert;
