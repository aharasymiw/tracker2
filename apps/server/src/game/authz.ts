import { ok, type Result } from '@lod/shared-utils';

/**
 * Semantic authorization for game intents.
 *
 * Zod validates shape; `canPerformAction` answers "can *this* actor, in
 * *this* session, at *this* tick, perform *this* action on *this* target?"
 *
 * TODO: Phase 3+ — implement actual checks:
 *   - combat turn ownership
 *   - peaceful-sector PvP bans
 *   - stat-band twink prevention
 *   - fortress raid declaration cooldowns
 *   - turn budget decrement (same transaction as the action!)
 */
export type AuthzError =
  | { kind: 'forbidden' }
  | { kind: 'not_your_turn' }
  | { kind: 'session_ended' };

export function canPerformAction(
  _session: unknown,
  _actor: unknown,
  _action: unknown,
): Result<void, AuthzError> {
  return ok(undefined);
}
