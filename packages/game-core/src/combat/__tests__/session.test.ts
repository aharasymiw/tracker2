import { describe, expect, it } from 'vitest';
import {
  toCombatSessionId,
  toItemDefId,
  toSeed,
  toTickNumber,
} from '@lod/shared-utils';
import {
  createCombatSession,
  deserializeSession,
  serializeSession,
} from '../CombatSession';
import type { Combatant } from '../../types';

const mkCombatant = (id: string, team: 'A' | 'B', x: number): Combatant => ({
  id,
  team,
  stats: { str: 10, dex: 10, agl: 10, hp: 50, hpMax: 50 },
  weaponLong: {
    id: toItemDefId('weapon.rifle'),
    name: 'Rifle',
    kind: 'long',
    base: 10,
    variance: 5,
    accuracy: 0,
    optimalRange: 5,
  },
  weaponClose: {
    id: toItemDefId('weapon.blade'),
    name: 'Blade',
    kind: 'close',
    base: 6,
    variance: 4,
    accuracy: 0,
  },
  position: { x, y: 0 },
  medkitsUsedThisSession: 0,
  initiative: 0,
  isAlive: true,
});

describe('createCombatSession', () => {
  it('initializes phase LongRange, round 1, with a turn order', () => {
    const session = createCombatSession({
      id: toCombatSessionId('combat.1'),
      seed: toSeed(123),
      participants: [mkCombatant('p1', 'A', 0), mkCombatant('p2', 'B', 6)],
      centerPosition: { x: 3, y: 0 },
      createdAtTick: toTickNumber(0),
    });
    expect(session.phase).toBe('LongRange');
    expect(session.round).toBe(1);
    expect(session.turnOrder.length).toBe(2);
    expect(session.prngSnapshot).toBeDefined();
  });

  it('produces identical sessions for identical seeds', () => {
    const p = [mkCombatant('p1', 'A', 0), mkCombatant('p2', 'B', 6)];
    const a = createCombatSession({
      id: toCombatSessionId('combat.1'),
      seed: toSeed(77),
      participants: p.map((c) => ({ ...c })),
      centerPosition: { x: 3, y: 0 },
      createdAtTick: toTickNumber(0),
    });
    const b = createCombatSession({
      id: toCombatSessionId('combat.1'),
      seed: toSeed(77),
      participants: p.map((c) => ({ ...c })),
      centerPosition: { x: 3, y: 0 },
      createdAtTick: toTickNumber(0),
    });
    expect(a.turnOrder).toEqual(b.turnOrder);
    expect(a.prngSnapshot).toEqual(b.prngSnapshot);
  });
});

describe('serializeSession / deserializeSession', () => {
  it('round-trips session state', () => {
    const session = createCombatSession({
      id: toCombatSessionId('combat.1'),
      seed: toSeed(42),
      participants: [mkCombatant('p1', 'A', 0), mkCombatant('p2', 'B', 6)],
      centerPosition: { x: 3, y: 0 },
      createdAtTick: toTickNumber(0),
    });
    const json = serializeSession(session);
    const restored = deserializeSession(json);
    expect(restored).toEqual(session);
  });
});
