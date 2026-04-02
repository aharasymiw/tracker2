import { eachRecentDay, startOfDay } from '@/lib/time';
import { type EntryRecord, type GoalPlan } from '@/types/models';

export interface GoalProgressSummary {
  currentWeekHits: number;
  targetHits: number | null;
  progressRatio: number | null;
  baselineAverageHits: number | null;
}

export function sumHits(entries: EntryRecord[]) {
  return entries.reduce((total, entry) => total + entry.amountHits, 0);
}

export function hitsInLastDays(entries: EntryRecord[], days: number, anchor = new Date()) {
  const threshold = startOfDay(anchor);
  threshold.setDate(threshold.getDate() - (days - 1));

  return sumHits(entries.filter((entry) => new Date(entry.occurredAt) >= threshold));
}

export function baselineAverageHits(
  entries: EntryRecord[],
  baselineDays: number,
  anchor = new Date(),
) {
  const threshold = startOfDay(anchor);
  threshold.setDate(threshold.getDate() - (baselineDays - 1));

  const baselineEntries = entries.filter((entry) => new Date(entry.occurredAt) >= threshold);

  if (baselineEntries.length === 0) {
    return null;
  }

  return Number((sumHits(baselineEntries) / baselineDays).toFixed(1));
}

export function buildGoalProgressSummary(
  entries: EntryRecord[],
  goalPlan: GoalPlan | null,
  anchor = new Date(),
): GoalProgressSummary {
  const currentWeekHits = hitsInLastDays(entries, 7, anchor);

  if (!goalPlan) {
    return {
      currentWeekHits,
      targetHits: null,
      progressRatio: null,
      baselineAverageHits: null,
    };
  }

  return {
    currentWeekHits,
    targetHits: goalPlan.weeklyTargetHits,
    progressRatio: Number(Math.min(currentWeekHits / goalPlan.weeklyTargetHits, 1.5).toFixed(2)),
    baselineAverageHits: baselineAverageHits(entries, goalPlan.baselineDays, anchor),
  };
}

export function buildWeeklyTrend(entries: EntryRecord[], anchor = new Date()) {
  return eachRecentDay(7, anchor).map((day) => {
    const dayKey = day.toISOString().slice(0, 10);

    const value = sumHits(entries.filter((entry) => entry.occurredAt.slice(0, 10) === dayKey));

    return {
      label: day.toLocaleDateString(undefined, { weekday: 'short' }),
      value,
    };
  });
}
