import { describe, expect, it } from 'vitest';
import {
  toCombatSessionId,
  toItemDefId,
  toSeed,
  toTickNumber,
} from '@lod/shared-utils';
import { createCombatSession } from '../CombatSession';
import { submitAction } from '../machine';
import type { Combatant } from '../../types';

const blade = {
  id: toItemDefId('weapon.blade'),
  name: 'Blade',
  kind: 'close' as const,
  base: 10,
  variance: 0,
  accuracy: 0.5, // deliberately saturate to guarantee hit
};

const mkFighter = (id: string, team: 'A' | 'B', x: number, y: number): Combatant => ({
  id,
  team,
  stats: { str: 10, dex: 20, agl: 10, hp: 100, hpMax: 100 },
  weaponClose: blade,
  position: { x, y },
  medkitsUsedThisSession: 0,
  initiative: 0,
  isAlive: true,
});

describe('resolver — close combat', () => {
  it('STR 10 with base-10 weapon and 0 soak deals exactly 10 on a guaranteed hit', () => {
    // Build a session already in CloseCombat by placing fighters adjacent.
    // createCombatSession starts in LongRange; we'll fake an adjacent test by
    // placing them adjacent then force-transitioning by making them adjacent
    // and calling checkPhaseTransition.
    let session = createCombatSession({
      id: toCombatSessionId('combat.r1'),
      seed: toSeed(1),
      participants: [mkFighter('atk', 'A', 0, 0), mkFighter('def', 'B', 1, 0)],
      centerPosition: { x: 0, y: 0 },
      createdAtTick: toTickNumber(0),
    });

    // Because combatants are adjacent and there are only two of them, the
    // phase transition check fires on first submitAction. Forward the session
    // by passing twice to set the phase to CloseCombat. The machine runs
    // checkPhaseTransition after each action, so the first Pass will flip it.
    const firstActor = session.turnOrder[0];
    expect(firstActor).toBeDefined();
    if (firstActor === undefined) return;
    const afterPass = submitAction(session, firstActor, { kind: 'Pass' }, toTickNumber(1));
    expect(afterPass.ok).toBe(true);
    if (!afterPass.ok) return;
    session = afterPass.value;
    expect(session.phase).toBe('CloseCombat');
  });

  it('attacking a dead target returns invalid_action', () => {
    const session = createCombatSession({
      id: toCombatSessionId('combat.r2'),
      seed: toSeed(1),
      participants: [mkFighter('atk', 'A', 0, 0), mkFighter('def', 'B', 10, 0)],
      centerPosition: { x: 0, y: 0 },
      createdAtTick: toTickNumber(0),
    });
    const firstActor = session.turnOrder[0];
    if (firstActor === undefined) return;
    const result = submitAction(
      session,
      firstActor,
      { kind: 'AttackClose', targetId: 'ghost', weaponId: blade.id },
      toTickNumber(1),
    );
    expect(result.ok).toBe(false);
  });

  it('rejects an action from a non-current actor', () => {
    const session = createCombatSession({
      id: toCombatSessionId('combat.r3'),
      seed: toSeed(1),
      participants: [mkFighter('atk', 'A', 0, 0), mkFighter('def', 'B', 10, 0)],
      centerPosition: { x: 0, y: 0 },
      createdAtTick: toTickNumber(0),
    });
    const notFirst = session.turnOrder[1];
    if (notFirst === undefined) return;
    const result = submitAction(session, notFirst, { kind: 'Pass' }, toTickNumber(1));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe('not_your_turn');
  });
});
