import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

/**
 * Audit log. Every sensitive mutation (admin action, failed login, fortress
 * raid step, item dupe attempt, etc.) writes a row here. Actors may be a
 * user, a character, or neither (system actions) — both columns nullable.
 */
export const auditLog = pgTable(
  'audit_log',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    actorUserId: uuid('actor_user_id'),
    actorCharacterId: uuid('actor_character_id'),
    action: text('action').notNull(),
    targetKind: text('target_kind').notNull(),
    targetId: text('target_id').notNull(),
    metadata: jsonb('metadata').notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    actorUserIdx: index('audit_actor_user_idx').on(table.actorUserId),
    actorCharacterIdx: index('audit_actor_character_idx').on(
      table.actorCharacterId,
    ),
    actionIdx: index('audit_action_idx').on(table.action, table.createdAt),
  }),
);

export type AuditLogRow = typeof auditLog.$inferSelect;
export type NewAuditLogRow = typeof auditLog.$inferInsert;
