import { PCG32 } from '@lod/game-rng';
import type { Result } from '@lod/shared-utils';
import { err, ok } from '@lod/shared-utils';
import { chebyshevDistance } from '../math-utils';
import { initiative as rollInitiativeValue } from '../stats/formulas';
import type { EntityId, TickNumber } from '../types';
import type { CombatAction } from './actions';
import {
  currentActor,
  findCombatant,
  type CombatSessionState,
} from './CombatSession';
import { rollInitiativeOrder } from './initiative';
import { resolveAction } from './resolver';

/**
 * After this many rounds, a LongRange phase force-transitions to CloseCombat
 * regardless of combatant positions. Keeps sessions from stalling at range
 * and matches the 5-round rule from the plan.
 */
const LONG_RANGE_ROUND_CAP = 5;

/**
 * Submit a single action for `actorId`. Validates that it is this actor's
 * turn and that the session is still active, delegates to `resolveAction`,
 * then runs phase and outcome checks and advances the turn cursor. Pure:
 * returns a new session on success or an error code on failure.
 */
export function submitAction(
  session: CombatSessionState,
  actorId: EntityId,
  action: CombatAction,
  tick: TickNumber,
): Result<
  CombatSessionState,
  'not_your_turn' | 'invalid_action' | 'session_ended'
> {
  if (session.outcome !== undefined) {
    return err('session_ended');
  }
  const expectedActor = currentActor(session);
  if (expectedActor !== actorId) {
    return err('not_your_turn');
  }
  const actor = findCombatant(session, actorId);
  if (actor === undefined || !actor.isAlive) {
    return err('invalid_action');
  }

  // Shape-level validation: attacks must reference a target in the session.
  if (action.kind === 'AttackLongRange' || action.kind === 'AttackClose') {
    const target = findCombatant(session, action.targetId);
    if (target === undefined || !target.isAlive) {
      return err('invalid_action');
    }
    if (action.kind === 'AttackLongRange' && session.phase !== 'LongRange') {
      return err('invalid_action');
    }
    if (action.kind === 'AttackClose' && session.phase !== 'CloseCombat') {
      return err('invalid_action');
    }
  }

  let next = resolveAction(session, actorId, action, tick);
  next = advanceTurn(next, tick);
  next = checkPhaseTransition(next, tick);
  next = checkOutcome(next, tick);
  return ok(next);
}

/**
 * Advance the turn cursor. If we wrap around the end of `turnOrder`, roll a
 * fresh initiative order (re-rolled each round per the plan) and increment
 * the round counter. Dead combatants are skipped; if nobody alive is left,
 * the caller's `checkOutcome` will terminate the session.
 */
export function advanceTurn(
  session: CombatSessionState,
  _tick: TickNumber,
): CombatSessionState {
  let index = session.currentTurnIndex + 1;
  let round = session.round;
  let turnOrder = session.turnOrder;
  let prngSnapshot = session.prngSnapshot;

  if (index >= turnOrder.length) {
    // End of round. Reroll initiative using the persisted PRNG state so the
    // stream stays deterministic.
    const rng = PCG32.restore(prngSnapshot);
    turnOrder = rollInitiativeOrder(rng, session.participants);
    // Cache the numeric roll so combatants' `initiative` fields are fresh
    // for UI display. We advance the PRNG a second time to do this, which
    // matches the formula stream order used below.
    const participantsWithInit = session.participants.map((p) => {
      if (!p.isAlive) return p;
      return {
        ...p,
        initiative: rollInitiativeValue(rng, p.stats.agl),
      };
    });
    prngSnapshot = rng.snapshot();
    index = 0;
    round += 1;
    return {
      ...session,
      participants: participantsWithInit,
      turnOrder,
      currentTurnIndex: index,
      round,
      prngSnapshot,
    };
  }

  // Skip dead combatants forward — if the next actor is dead, keep walking.
  while (index < turnOrder.length) {
    const candidate = turnOrder[index];
    if (candidate === undefined) break;
    const combatant = findCombatant(session, candidate);
    if (combatant !== undefined && combatant.isAlive) break;
    index += 1;
  }

  return { ...session, currentTurnIndex: index };
}

/**
 * Check whether the session should transition phases. Rules:
 * - LongRange → CloseCombat when every pair of alive combatants is within
 *   Chebyshev distance 1 (i.e., everyone is adjacent), OR when `round`
 *   exceeds `LONG_RANGE_ROUND_CAP`.
 * - CloseCombat never auto-transitions back.
 *
 * Appends a `phase-transition` log entry when a transition fires.
 */
export function checkPhaseTransition(
  session: CombatSessionState,
  tick: TickNumber,
): CombatSessionState {
  if (session.phase !== 'LongRange') return session;

  const alive = session.participants.filter((p) => p.isAlive);
  if (alive.length < 2) return session;

  let allAdjacent = true;
  outer: for (let i = 0; i < alive.length; i += 1) {
    for (let j = i + 1; j < alive.length; j += 1) {
      const a = alive[i];
      const b = alive[j];
      if (a === undefined || b === undefined) continue;
      if (chebyshevDistance(a.position, b.position) > 1) {
        allAdjacent = false;
        break outer;
      }
    }
  }

  if (!allAdjacent && session.round <= LONG_RANGE_ROUND_CAP) {
    return session;
  }

  return {
    ...session,
    phase: 'CloseCombat',
    log: [
      ...session.log,
      {
        kind: 'phase-transition',
        from: 'LongRange',
        to: 'CloseCombat',
        round: session.round,
        tick,
      },
    ],
  };
}

/**
 * Check whether the combat session has ended. A session ends when only one
 * team has alive combatants remaining, or when nobody is left at all (draw).
 */
export function checkOutcome(
  session: CombatSessionState,
  tick: TickNumber,
): CombatSessionState {
  if (session.outcome !== undefined) return session;

  const alive = session.participants.filter((p) => p.isAlive);
  if (alive.length === 0) {
    return {
      ...session,
      phase: 'Resolution',
      outcome: { winnerTeam: 'draw', endedAtTick: tick },
    };
  }

  const teamA = alive.filter((p) => p.team === 'A').length;
  const teamB = alive.filter((p) => p.team === 'B').length;

  if (teamA > 0 && teamB === 0) {
    return {
      ...session,
      phase: 'Resolution',
      outcome: { winnerTeam: 'A', endedAtTick: tick },
    };
  }
  if (teamB > 0 && teamA === 0) {
    return {
      ...session,
      phase: 'Resolution',
      outcome: { winnerTeam: 'B', endedAtTick: tick },
    };
  }

  return session;
}
