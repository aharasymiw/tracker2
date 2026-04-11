import type { Result } from '@lod/shared-utils';
import { err, ok } from '@lod/shared-utils';
import type { Stats } from '../types';
import { sellbackCredits, trainingCost } from './formulas';

/**
 * Character-creation point-buy constants. Budget of 30 is distributed across
 * STR/DEX/AGL/HP with each stat bounded to [1, 15] at creation time (training
 * in-game can push them higher).
 */
export const STARTING_POINTS = 30;
export const MIN_STAT_AT_CREATE = 1;
export const MAX_STAT_AT_CREATE = 15;

/**
 * Starting HP_MAX for a freshly created character. HP points in the point-buy
 * are conceptually "bonus HP per point"; the runtime stat still respects this
 * cap when applied.
 */
export const STARTING_HP_MAX = 50;

export type TrainableStat = 'STR' | 'DEX' | 'AGL' | 'HP';

/**
 * Validate a point-buy allocation for a new character. All four stats must be
 * integers in [MIN_STAT_AT_CREATE, MAX_STAT_AT_CREATE] and sum to exactly
 * STARTING_POINTS. We return a string error so the caller can surface the
 * reason directly in the create-character form.
 */
export function validatePointBuy(stats: {
  str: number;
  dex: number;
  agl: number;
  hp: number;
}): Result<void, string> {
  const entries: [TrainableStat, number][] = [
    ['STR', stats.str],
    ['DEX', stats.dex],
    ['AGL', stats.agl],
    ['HP', stats.hp],
  ];

  for (const [name, value] of entries) {
    if (!Number.isInteger(value)) {
      return err(`${name} must be an integer, got ${value}`);
    }
    if (value < MIN_STAT_AT_CREATE) {
      return err(`${name} must be at least ${MIN_STAT_AT_CREATE}`);
    }
    if (value > MAX_STAT_AT_CREATE) {
      return err(`${name} must be at most ${MAX_STAT_AT_CREATE}`);
    }
  }

  const total = stats.str + stats.dex + stats.agl + stats.hp;
  if (total !== STARTING_POINTS) {
    return err(
      `point-buy must total ${STARTING_POINTS} points, got ${total}`,
    );
  }

  return ok(undefined);
}

/**
 * Return the current value of a trainable stat, picking the right field from
 * the `Stats` shape. HP training raises `hpMax` (and, by convention, current
 * HP along with it — see `applyTraining`).
 */
const readStat = (stats: Stats, which: TrainableStat): number => {
  switch (which) {
    case 'STR':
      return stats.str;
    case 'DEX':
      return stats.dex;
    case 'AGL':
      return stats.agl;
    case 'HP':
      return stats.hpMax;
  }
};

/**
 * Spend credits to raise one stat by `points`. Returns an updated `Stats`
 * object plus the total credits spent. Each point charges `trainingCost` at
 * the *current* stat value, so costs compound as the stat climbs. We never
 * mutate the incoming `Stats` — downstream callers assume purity.
 *
 * Supports negative `points` (sell-back). Sell-back refunds 40% of the
 * purchase cost via `sellbackCredits`. The stat may not drop below 1.
 */
export function applyTraining(
  current: Stats,
  stat: TrainableStat,
  points: number,
  credits: number,
): Result<{ stats: Stats; creditsSpent: number }, string> {
  if (!Number.isInteger(points) || points === 0) {
    return err(`points must be a non-zero integer, got ${points}`);
  }

  const next: Stats = { ...current };
  let creditsDelta = 0;

  if (points > 0) {
    for (let i = 0; i < points; i += 1) {
      const value = readStat(next, stat);
      const cost = trainingCost(value);
      if (credits - creditsDelta < cost) {
        return err(
          `insufficient credits: need ${cost} for next ${stat} point, have ${
            credits - creditsDelta
          }`,
        );
      }
      creditsDelta += cost;
      writeStat(next, stat, value + 1);
    }
  } else {
    const drop = -points;
    for (let i = 0; i < drop; i += 1) {
      const value = readStat(next, stat);
      if (value <= 1) {
        return err(`${stat} cannot drop below 1`);
      }
      // Sellback is priced at the *new* (post-drop) stat value — consistent
      // with "buying this point would have cost X; we refund 40% of X".
      const refund = sellbackCredits(value - 1);
      creditsDelta -= refund;
      writeStat(next, stat, value - 1);
    }
  }

  return ok({ stats: next, creditsSpent: creditsDelta });
}

/**
 * Mutate a `Stats` draft in place. Kept private — callers above spread into a
 * fresh object so the input `Stats` is never observed to change.
 */
const writeStat = (stats: Stats, which: TrainableStat, value: number): void => {
  switch (which) {
    case 'STR':
      stats.str = value;
      return;
    case 'DEX':
      stats.dex = value;
      return;
    case 'AGL':
      stats.agl = value;
      return;
    case 'HP': {
      // HP training raises the ceiling; current HP scales with the ceiling so
      // a training trip also refills you to the new cap.
      const delta = value - stats.hpMax;
      stats.hpMax = value;
      stats.hp = stats.hp + delta;
      return;
    }
  }
};
