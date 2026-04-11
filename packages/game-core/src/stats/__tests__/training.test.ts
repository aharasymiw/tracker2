import { describe, expect, it } from 'vitest';
import {
  MAX_STAT_AT_CREATE,
  STARTING_HP_MAX,
  STARTING_POINTS,
  applyTraining,
  validatePointBuy,
} from '../training';
import type { Stats } from '../../types';
import { trainingCost } from '../formulas';

describe('validatePointBuy', () => {
  it('accepts a valid 30-point allocation', () => {
    const r = validatePointBuy({ str: 8, dex: 8, agl: 7, hp: 7 });
    expect(r.ok).toBe(true);
  });

  it('rejects over-budget allocations', () => {
    const r = validatePointBuy({ str: 15, dex: 15, agl: 15, hp: 15 });
    expect(r.ok).toBe(false);
  });

  it('rejects under-budget allocations', () => {
    const r = validatePointBuy({ str: 1, dex: 1, agl: 1, hp: 1 });
    expect(r.ok).toBe(false);
  });

  it('rejects stat values below the minimum', () => {
    const r = validatePointBuy({
      str: 0,
      dex: 10,
      agl: 10,
      hp: STARTING_POINTS - 20,
    });
    expect(r.ok).toBe(false);
  });

  it('rejects stat values above the creation cap', () => {
    const r = validatePointBuy({
      str: MAX_STAT_AT_CREATE + 1,
      dex: 5,
      agl: 5,
      hp: STARTING_POINTS - (MAX_STAT_AT_CREATE + 1) - 10,
    });
    expect(r.ok).toBe(false);
  });

  it('rejects non-integer allocations', () => {
    const r = validatePointBuy({ str: 7.5, dex: 7.5, agl: 7.5, hp: 7.5 });
    expect(r.ok).toBe(false);
  });
});

describe('applyTraining', () => {
  const baseStats = (): Stats => ({
    str: 10,
    dex: 10,
    agl: 10,
    hp: STARTING_HP_MAX,
    hpMax: STARTING_HP_MAX,
  });

  it('buys one STR point and charges trainingCost(10)', () => {
    const stats = baseStats();
    const result = applyTraining(stats, 'STR', 1, 1_000_000);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.stats.str).toBe(11);
    expect(result.value.creditsSpent).toBe(trainingCost(10));
  });

  it('compounds costs across multiple points in one call', () => {
    const stats = baseStats();
    const expected = trainingCost(10) + trainingCost(11);
    const result = applyTraining(stats, 'STR', 2, 1_000_000);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.stats.str).toBe(12);
    expect(result.value.creditsSpent).toBe(expected);
  });

  it('rejects insufficient credits', () => {
    const stats = baseStats();
    const result = applyTraining(stats, 'STR', 1, 0);
    expect(result.ok).toBe(false);
  });

  it('does not mutate the input stats object', () => {
    const stats = baseStats();
    const snapshot = { ...stats };
    applyTraining(stats, 'DEX', 1, 1_000_000);
    expect(stats).toEqual(snapshot);
  });

  it('rejects zero points', () => {
    const stats = baseStats();
    const result = applyTraining(stats, 'STR', 0, 1_000);
    expect(result.ok).toBe(false);
  });

  it('supports negative sellback', () => {
    const stats = baseStats();
    const result = applyTraining(stats, 'STR', -1, 0);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.stats.str).toBe(9);
    // Sellback is NEGATIVE creditsSpent (refund).
    expect(result.value.creditsSpent).toBeLessThan(0);
  });

  it('refuses to sell below 1', () => {
    const stats: Stats = { str: 1, dex: 10, agl: 10, hp: 50, hpMax: 50 };
    const result = applyTraining(stats, 'STR', -1, 0);
    expect(result.ok).toBe(false);
  });
});
