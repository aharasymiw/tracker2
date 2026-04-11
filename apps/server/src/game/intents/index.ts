import type { Envelope } from '@lod/protocol';
import { err, ok, type Result } from '@lod/shared-utils';
import type { Connection } from '../../net/connection.js';
import type { GameWorld } from '../GameWorld.js';

/**
 * Intent dispatch entrypoint.
 *
 * Every inbound envelope that parses cleanly is passed here. For Phase 0-2
 * we return `not_implemented` for every intent kind; Phase 3+ fills in
 * per-intent handlers under `./move.ts`, `./attack.ts`, etc.
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
  _ctx: IntentContext,
): Result<void, IntentError> {
  // TODO: Phase 3+ — route `envelope.type` to individual intent handlers.
  return err({
    code: 'not_implemented',
    message: `intent routing TODO for type '${envelope.type}'`,
  });
}

// Re-export for convenience
export { ok };
