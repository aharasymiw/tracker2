import type { Envelope } from '@lod/protocol';
import { err, ok, type Result } from '@lod/shared-utils';
import type { Connection } from '../../net/connection.js';
import type { GameWorld } from '../GameWorld.js';
import { canPerformAction } from '../authz.js';

/**
 * Intent dispatch entrypoint.
 *
 * Every inbound envelope that parses cleanly is passed here. The flow is:
 *   1. Semantic authorization (`canPerformAction`)
 *   2. Route to the per-type handler
 *
 * For Phase 0-2 step 2 returns `not_implemented` for every intent kind;
 * Phase 3+ fills in per-intent handlers under `./move.ts`, `./attack.ts`, etc.
 */
export interface IntentContext {
  connection: Connection;
  world: GameWorld;
}

export interface IntentError {
  code: string;
  message: string;
}

export function dispatchIntent(
  envelope: Envelope,
  ctx: IntentContext,
): Result<void, IntentError> {
  const authz = canPerformAction(
    { characterId: ctx.connection.characterId, world: ctx.world },
    envelope,
  );
  if (!authz.ok) {
    return err({
      code: authz.error.kind,
      message:
        'reason' in authz.error
          ? authz.error.reason
          : `action denied: ${authz.error.kind}`,
    });
  }

  // TODO: Phase 3+ — route `envelope.type` to individual intent handlers.
  return err({
    code: 'not_implemented',
    message: `intent routing TODO for type '${envelope.type}'`,
  });
}

// Re-export for convenience
export { ok };
