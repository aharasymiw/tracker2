import type { PCG32 } from '@lod/game-rng';
import { clamp, floor, log2, max, min, pow } from '../math-utils';
import type { WeaponDef } from '../types';

/**
 * Combat formula library. Every function in here is pure w.r.t. its inputs
 * (including the PRNG instance, which advances its internal state as a side
 * effect of the *instance* but not of these functions — the caller owns and
 * passes it). The numbers below are the authoritative tuning knobs from the
 * design plan; tests lock the boundary values in place.
 */

/**
 * Shared hit-chance formula used by both LongRange and CloseCombat phases.
 * Clamped to [0.05, 0.95] so "always miss" and "always hit" are impossible.
 */
export function hitChance(params: {
  attackerDex: number;
  defenderAgl: number;
  weaponAccuracyBonus: number;
  rangeModifier: number;
  coverModifier: number;
}): number {
  return clamp(
    0.5 +
      0.03 * (params.attackerDex - params.defenderAgl) +
      params.weaponAccuracyBonus +
      params.rangeModifier +
      params.coverModifier,
    0.05,
    0.95,
  );
}

/**
 * Close-combat damage. STR multiplier is logarithmic (~30% per doubling of
 * STR), so STR 10 → 1.0×, STR 20 → 1.3×, STR 40 → 1.6×. Armor soak follows a
 * diminishing-returns curve that caps at 75% mitigation regardless of soak
 * value. Minimum damage is 1 — a hit should always sting.
 */
export function closeCombatDamage(params: {
  rng: PCG32;
  attackerStr: number;
  weapon: WeaponDef;
  armorSoak: number;
}): number {
  // Guard log2(0) by clamping STR/10 at a tiny epsilon. Callers are expected
  // to keep STR >= 1 but we defend anyway so a bad input cannot NaN the sim.
  const strMultiplier = 1.0 + 0.3 * log2(max(params.attackerStr / 10, 0.0001));
  const baseRoll = params.rng.roll(
    params.weapon.base,
    params.weapon.base + params.weapon.variance,
  );
  const raw = baseRoll * strMultiplier;
  const mitigation = 1.0 - min(0.75, params.armorSoak / (params.armorSoak + 50));
  return max(1, floor(raw * mitigation));
}

/**
 * Long-range damage. Marksmanship bonus keys off DEX, not STR. Range falloff
 * kicks in past the weapon's optimalRange and floors at 0.25×. Armor has its
 * own `soakLong` slot so long-range resistance can be tuned independently.
 */
export function longRangeDamage(params: {
  rng: PCG32;
  attackerDex: number;
  weapon: WeaponDef;
  distance: number;
  armorSoakLong: number;
}): number {
  const baseRoll = params.rng.roll(
    params.weapon.base,
    params.weapon.base + params.weapon.variance,
  );
  const dexBonus = 1.0 + 0.01 * max(0, params.attackerDex - 10);
  const optimalRange = params.weapon.optimalRange ?? 5;
  const rangeFalloff = clamp(
    1.0 - 0.05 * max(0, params.distance - optimalRange),
    0.25,
    1.0,
  );
  const mitigation =
    1.0 - min(0.75, params.armorSoakLong / (params.armorSoakLong + 50));
  return max(1, floor(baseRoll * dexBonus * rangeFalloff * mitigation));
}

/**
 * Critical hit chance. Bounded to [0.01, 0.25] so a DEX advantage tops out at
 * a quarter of hits being crits — prevents DEX stacking from becoming a
 * one-shot build.
 */
export function critChance(attackerDex: number, defenderDex: number): number {
  return clamp(0.05 + (0.01 * (attackerDex - defenderDex)) / 10, 0.01, 0.25);
}

/**
 * Flee chance. Consumes the attacker's turn regardless of outcome; a failed
 * flee still eats an opponent attack (enforced upstream in the resolver).
 */
export function fleeChance(attackerAgl: number, opponentAgl: number): number {
  return clamp(0.4 + 0.03 * (attackerAgl - opponentAgl), 0.1, 0.9);
}

/**
 * Initiative. Re-rolled each round; ties are broken downstream by entityId
 * for determinism.
 */
export function initiative(rng: PCG32, agl: number): number {
  return agl + rng.roll(1, 20);
}

/**
 * Radiation grenade AoE damage, keyed on Chebyshev distance from the center
 * tile. Center roll is 40–80, falloff is 35% per ring, floored at zero. At
 * distance >= 3 the damage is 0, so callers know the effective radius is 2.
 */
export function radGrenadeDamage(
  rng: PCG32,
  chebyshevDistanceFromCenter: number,
): number {
  const center = rng.roll(40, 80);
  const falloff = 1.0 - 0.35 * chebyshevDistanceFromCenter;
  return max(0, floor(center * max(0, falloff)));
}

/**
 * Medkit healing. Roll 20–40 plus a small DEX bonus (field-medic training).
 * Medkits cap at 3 uses per combat session; enforced in the action resolver,
 * not here.
 */
export function medkitHeal(rng: PCG32, userDex: number): number {
  return rng.roll(20, 40) + floor(userDex / 4);
}

/**
 * Cost to train one stat point past `currentStatValue`. Exponential ramp
 * (1.15×) prevents infinite min-maxing. `trainingCost(1) = floor(50 * 1.15) = 57`.
 */
export function trainingCost(currentStatValue: number): number {
  return floor(50 * pow(1.15, currentStatValue));
}

/**
 * Sellback credits for removing one stat point. 40% of the purchase cost —
 * discourages but allows respecs.
 */
export function sellbackCredits(currentStatValue: number): number {
  return floor(trainingCost(currentStatValue) * 0.4);
}
