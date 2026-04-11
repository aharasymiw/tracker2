import { describe, expect, it } from 'vitest';
import { PCG32 } from '@lod/game-rng';
import { toItemDefId } from '@lod/shared-utils';
import {
  closeCombatDamage,
  critChance,
  fleeChance,
  hitChance,
  initiative,
  longRangeDamage,
  medkitHeal,
  radGrenadeDamage,
  sellbackCredits,
  trainingCost,
} from '../formulas';
import type { WeaponDef } from '../../types';

/**
 * Tests are written to lock the *current* formula constants in place. If a
 * playtest justifies tweaking the constants, these numbers must be updated
 * in lock-step; CI failure is the desired signal.
 */

const mkWeapon = (overrides: Partial<WeaponDef> = {}): WeaponDef => ({
  id: toItemDefId('test.weapon'),
  name: 'Test',
  kind: 'close',
  base: 10,
  variance: 0,
  accuracy: 0,
  ...overrides,
});

describe('hitChance', () => {
  it('centers at 0.50 when DEX equals AGL and no modifiers', () => {
    const chance = hitChance({
      attackerDex: 10,
      defenderAgl: 10,
      weaponAccuracyBonus: 0,
      rangeModifier: 0,
      coverModifier: 0,
    });
    expect(chance).toBeCloseTo(0.5, 10);
  });

  it('adds 0.03 per DEX point advantage', () => {
    const chance = hitChance({
      attackerDex: 20,
      defenderAgl: 10,
      weaponAccuracyBonus: 0,
      rangeModifier: 0,
      coverModifier: 0,
    });
    expect(chance).toBeCloseTo(0.8, 10);
  });

  it('clamps at upper bound 0.95', () => {
    const chance = hitChance({
      attackerDex: 100,
      defenderAgl: 1,
      weaponAccuracyBonus: 0.2,
      rangeModifier: 0,
      coverModifier: 0,
    });
    expect(chance).toBe(0.95);
  });

  it('clamps at lower bound 0.05', () => {
    const chance = hitChance({
      attackerDex: 1,
      defenderAgl: 100,
      weaponAccuracyBonus: -0.2,
      rangeModifier: -0.15,
      coverModifier: -0.2,
    });
    expect(chance).toBe(0.05);
  });

  it('applies cover modifier', () => {
    const chance = hitChance({
      attackerDex: 10,
      defenderAgl: 10,
      weaponAccuracyBonus: 0,
      rangeModifier: 0,
      coverModifier: -0.2,
    });
    expect(chance).toBeCloseTo(0.3, 10);
  });
});

describe('closeCombatDamage', () => {
  it('yields minimum 1 damage on a heavy-armor target', () => {
    const rng = new PCG32(42);
    const dmg = closeCombatDamage({
      rng,
      attackerStr: 1,
      weapon: mkWeapon({ base: 1, variance: 0 }),
      armorSoak: 10_000,
    });
    expect(dmg).toBeGreaterThanOrEqual(1);
  });

  it('caps mitigation at 75%', () => {
    // With an unreachable armor value, mitigation = 1 - 0.75 = 0.25.
    // STR 10 → multiplier = 1.0. Base roll fixed at 100 (base=100, var=0).
    const rng = new PCG32(7);
    const dmg = closeCombatDamage({
      rng,
      attackerStr: 10,
      weapon: mkWeapon({ base: 100, variance: 0 }),
      armorSoak: 1_000_000,
    });
    expect(dmg).toBe(25);
  });

  it('STR 20 gives ~1.3× the damage of STR 10 with fixed roll', () => {
    const rngA = new PCG32(123);
    const rngB = new PCG32(123);
    const weapon = mkWeapon({ base: 100, variance: 0 });
    const low = closeCombatDamage({
      rng: rngA,
      attackerStr: 10,
      weapon,
      armorSoak: 0,
    });
    const high = closeCombatDamage({
      rng: rngB,
      attackerStr: 20,
      weapon,
      armorSoak: 0,
    });
    expect(low).toBe(100);
    expect(high).toBe(130);
  });
});

describe('longRangeDamage', () => {
  it('DEX above 10 gives marksmanship bonus', () => {
    const rngA = new PCG32(1);
    const rngB = new PCG32(1);
    const weapon = mkWeapon({ base: 100, variance: 0, kind: 'long', optimalRange: 5 });
    const low = longRangeDamage({
      rng: rngA,
      attackerDex: 10,
      weapon,
      distance: 3,
      armorSoakLong: 0,
    });
    const high = longRangeDamage({
      rng: rngB,
      attackerDex: 20,
      weapon,
      distance: 3,
      armorSoakLong: 0,
    });
    expect(low).toBe(100);
    expect(high).toBe(110);
  });

  it('range falloff floors at 0.25', () => {
    const rng = new PCG32(99);
    const weapon = mkWeapon({ base: 100, variance: 0, kind: 'long', optimalRange: 5 });
    const dmg = longRangeDamage({
      rng,
      attackerDex: 10,
      weapon,
      distance: 10_000,
      armorSoakLong: 0,
    });
    // 100 * 1.0 * 0.25 * 1.0 = 25.
    expect(dmg).toBe(25);
  });

  it('no falloff within optimal range', () => {
    const rng = new PCG32(5);
    const weapon = mkWeapon({ base: 100, variance: 0, kind: 'long', optimalRange: 5 });
    const dmg = longRangeDamage({
      rng,
      attackerDex: 10,
      weapon,
      distance: 5,
      armorSoakLong: 0,
    });
    expect(dmg).toBe(100);
  });

  it('mitigation with soakLong = 50 is 50%', () => {
    const rng = new PCG32(500);
    const weapon = mkWeapon({ base: 100, variance: 0, kind: 'long', optimalRange: 5 });
    const dmg = longRangeDamage({
      rng,
      attackerDex: 10,
      weapon,
      distance: 3,
      armorSoakLong: 50,
    });
    // 100 * 1.0 * 1.0 * (1 - 0.5) = 50.
    expect(dmg).toBe(50);
  });
});

describe('critChance and fleeChance', () => {
  it('critChance clamps to [0.01, 0.25]', () => {
    expect(critChance(1, 1000)).toBe(0.01);
    expect(critChance(1000, 1)).toBe(0.25);
    expect(critChance(10, 10)).toBeCloseTo(0.05, 10);
  });

  it('fleeChance clamps to [0.10, 0.90]', () => {
    expect(fleeChance(1, 1000)).toBe(0.1);
    expect(fleeChance(1000, 1)).toBe(0.9);
    expect(fleeChance(10, 10)).toBeCloseTo(0.4, 10);
  });
});

describe('radGrenadeDamage', () => {
  it('zero damage at Chebyshev distance >= 3', () => {
    for (let i = 0; i < 20; i += 1) {
      const rng = new PCG32(i);
      expect(radGrenadeDamage(rng, 3)).toBe(0);
      const rng2 = new PCG32(i);
      expect(radGrenadeDamage(rng2, 5)).toBe(0);
    }
  });

  it('center tile is the full rolled value', () => {
    const rng = new PCG32(9876);
    const dmg = radGrenadeDamage(rng, 0);
    expect(dmg).toBeGreaterThanOrEqual(40);
    expect(dmg).toBeLessThanOrEqual(80);
  });
});

describe('medkitHeal', () => {
  it('includes DEX bonus floor(DEX/4)', () => {
    const rng = new PCG32(33);
    const heal = medkitHeal(rng, 20);
    // Roll is 20..40, so minimum is 20 + 5 = 25 and maximum is 40 + 5 = 45.
    expect(heal).toBeGreaterThanOrEqual(25);
    expect(heal).toBeLessThanOrEqual(45);
  });
});

describe('trainingCost and sellback', () => {
  it('trainingCost(1) = 57', () => {
    expect(trainingCost(1)).toBe(57);
  });

  it('trainingCost(0) = 50', () => {
    expect(trainingCost(0)).toBe(50);
  });

  it('sellback is 40% of training cost, floored', () => {
    expect(sellbackCredits(1)).toBe(22); // floor(57 * 0.4) = 22
    expect(sellbackCredits(0)).toBe(20); // floor(50 * 0.4) = 20
  });
});

describe('initiative', () => {
  it('returns AGL + 1..20 inclusive', () => {
    for (let i = 0; i < 500; i += 1) {
      const rng = new PCG32(i);
      const value = initiative(rng, 10);
      expect(value).toBeGreaterThanOrEqual(11);
      expect(value).toBeLessThanOrEqual(30);
    }
  });
});
