import { describe, expect, it } from 'vitest';
import { PCG32 } from '@lod/game-rng';
import { toItemDefId } from '@lod/shared-utils';
import { closeCombatDamage, longRangeDamage } from '../../stats/formulas';
import type { WeaponDef } from '../../types';

const longWeapon: WeaponDef = {
  id: toItemDefId('weapon.rifle'),
  name: 'Rifle',
  kind: 'long',
  base: 20,
  variance: 10,
  accuracy: 0,
  optimalRange: 5,
};

const closeWeapon: WeaponDef = {
  id: toItemDefId('weapon.blade'),
  name: 'Blade',
  kind: 'close',
  base: 15,
  variance: 5,
  accuracy: 0,
};

describe('formulas determinism via PCG32', () => {
  it('two fresh PCG32s with the same seed yield identical damage sequences', () => {
    const a = new PCG32(99);
    const b = new PCG32(99);
    for (let i = 0; i < 25; i += 1) {
      const da = longRangeDamage({
        rng: a,
        attackerDex: 15,
        weapon: longWeapon,
        distance: 4,
        armorSoakLong: 10,
      });
      const db = longRangeDamage({
        rng: b,
        attackerDex: 15,
        weapon: longWeapon,
        distance: 4,
        armorSoakLong: 10,
      });
      expect(da).toBe(db);
    }
  });

  it('snapshot/restore of PCG32 preserves the downstream close damage stream', () => {
    const a = new PCG32(7);
    // Advance a few rolls.
    a.next();
    a.next();
    const snap = a.snapshot();
    const d1 = closeCombatDamage({
      rng: a,
      attackerStr: 12,
      weapon: closeWeapon,
      armorSoak: 0,
    });
    const restored = PCG32.restore(snap);
    const d2 = closeCombatDamage({
      rng: restored,
      attackerStr: 12,
      weapon: closeWeapon,
      armorSoak: 0,
    });
    expect(d1).toBe(d2);
  });
});
