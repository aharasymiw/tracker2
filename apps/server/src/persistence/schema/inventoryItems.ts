import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

/**
 * Inventory items table.
 *
 * `owner_kind` is one of 'character' | 'fortress' | 'combat_reserve'.
 * `equipped_slot` is nullable; the partial unique index enforces "at most one
 * item per equipped slot per owner" when equipped_slot is not null.
 *
 * Anti-dupe contract (three layers):
 *   1. **PK** — each item has a unique UUID `id`. An item can only exist in
 *      one row, so it can only have one `(owner_kind, owner_id)` pair.
 *   2. **Partial unique on equipped_slot** — at most one item per slot per owner.
 *   3. **Service layer** — `transferItem()` in `@lod/game-core` clones
 *      inventories and does remove-then-add, never copy. DB writes are
 *      transactional (remove old row + insert new row in one TX).
 *
 * Never mutate an inventory item without going through the repository helpers.
 */
export const inventoryItems = pgTable(
  'inventory_items',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    ownerKind: text('owner_kind').notNull(),
    ownerId: uuid('owner_id').notNull(),
    itemDefId: text('item_def_id').notNull(),
    qty: integer('qty').notNull().default(1),
    equippedSlot: text('equipped_slot'),
    metadata: jsonb('metadata').notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    ownerIdx: index('inventory_owner_idx').on(table.ownerKind, table.ownerId),
    uniqueEquippedSlot: uniqueIndex('inventory_unique_equipped_slot')
      .on(table.ownerKind, table.ownerId, table.equippedSlot)
      .where(sql`${table.equippedSlot} is not null`),
    qtyPositive: check(
      'inventory_qty_positive',
      sql`${table.qty} >= 1`,
    ),
    ownerKindValid: check(
      'inventory_owner_kind_valid',
      sql`${table.ownerKind} in ('character', 'fortress', 'combat_reserve')`,
    ),
  }),
);

export type InventoryItemRow = typeof inventoryItems.$inferSelect;
export type NewInventoryItemRow = typeof inventoryItems.$inferInsert;
