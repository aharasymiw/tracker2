import { describe, expect, it } from 'vitest';
import {
  toCombatSessionId,
  toItemDefId,
  toSeed,
  toTickNumber,
} from '@lod/shared-utils';
import { createCombatSession, serializeSession } from '../CombatSession';
import { submitAction } from '../machine';
import type { CombatAction } from '../actions';
import type { Combatant } from '../../types';

/**
 * Golden replay test — exercises the determinism guarantee. Given identical
 * inputs (session config, seed, action sequence), 100 iterations must all
 * produce the exact same session.log and final serialized state. If anything
 * non-deterministic creeps into combat (wall clock, Math.random, unstable
 * iteration order), this test will catch it.
 */

const rifle = {
  id: toItemDefId('weapon.rifle'),
  name: 'Rifle',
  kind: 'long' as const,
  base: 20,
  variance: 10,
  accuracy: 0.1,
  optimalRange: 5,
};
const blade = {
  id: toItemDefId('weapon.blade'),
  name: 'Blade',
  kind: 'close' as const,
  base: 12,
  variance: 6,
  accuracy: 0,
};

const mkFighter = (id: string, team: 'A' | 'B', x: number): Combatant => ({
  id,
  team,
  stats: { str: 12, dex: 14, agl: 10, hp: 80, hpMax: 80 },
  weaponLong: rifle,
  weaponClose: blade,
  position: { x, y: 0 },
  medkitsUsedThisSession: 0,
  initiative: 0,
  isAlive: true,
});

const buildInitial = () =>
  createCombatSession({
    id: toCombatSessionId('combat.replay'),
    seed: toSeed(424242),
    participants: [mkFighter('hero', 'A', 0), mkFighter('mutant', 'B', 6)],
    centerPosition: { x: 3, y: 0 },
    createdAtTick: toTickNumber(0),
  });

const actionScript = (): CombatAction[] => [
  { kind: 'AttackLongRange', targetId: 'mutant', weaponId: rifle.id },
  { kind: 'AttackLongRange', targetId: 'hero', weaponId: rifle.id },
  { kind: 'AttackLongRange', targetId: 'mutant', weaponId: rifle.id },
  { kind: 'AttackLongRange', targetId: 'hero', weaponId: rifle.id },
  { kind: 'Pass' },
  { kind: 'Pass' },
];

function runOne(): string {
  let session = buildInitial();
  let tick = 1;
  for (const action of actionScript()) {
    const actor = session.turnOrder[session.currentTurnIndex];
    if (actor === undefined) break;
    if (session.outcome !== undefined) break;
    const r = submitAction(session, actor, action, toTickNumber(tick));
    if (!r.ok) {
      // The machine may reject Close actions in LongRange phase — convert to
      // Pass and keep going so the replay still consumes the same number of
      // turns. We log the rejection implicitly by marker.
      const passResult = submitAction(
        session,
        actor,
        { kind: 'Pass' },
        toTickNumber(tick),
      );
      if (!passResult.ok) break;
      session = passResult.value;
    } else {
      session = r.value;
    }
    tick += 1;
  }
  return serializeSession(session);
}

describe('golden replay determinism', () => {
  it('produces byte-identical serialized state across 100 iterations', () => {
    const first = runOne();
    for (let i = 0; i < 99; i += 1) {
      const next = runOne();
      expect(next).toBe(first);
    }
  });
});
