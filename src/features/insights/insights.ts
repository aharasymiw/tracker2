import { buildGoalProgressSummary, buildWeeklyTrend, sumHits } from '@/features/goals/goal-math';
import { eachRecentDay } from '@/lib/time';
import {
  type EntryRecord,
  type GoalPlan,
  type InsightSeries,
  type InsightPoint,
} from '@/types/models';

function buildWindowTrend(entries: EntryRecord[], totalDays: number, anchor = new Date()) {
  return eachRecentDay(totalDays, anchor).map((day) => {
    const dayKey = day.toISOString().slice(0, 10);

    return {
      label:
        totalDays > 7
          ? day.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })
          : day.toLocaleDateString(undefined, { weekday: 'short' }),
      value: sumHits(entries.filter((entry) => entry.occurredAt.slice(0, 10) === dayKey)),
    };
  });
}

function buildSessionTrend(entries: EntryRecord[], totalDays: number, anchor = new Date()) {
  return eachRecentDay(totalDays, anchor).map((day) => {
    const dayKey = day.toISOString().slice(0, 10);

    return {
      label: day.toLocaleDateString(undefined, { weekday: 'short' }),
      value: entries.filter((entry) => entry.occurredAt.slice(0, 10) === dayKey).length,
    };
  });
}

function buildTypeMix(entries: EntryRecord[]): InsightPoint[] {
  const counts = new Map<string, number>();

  for (const entry of entries) {
    counts.set(entry.type, (counts.get(entry.type) ?? 0) + entry.amountHits);
  }

  return [...counts.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((left, right) => right.value - left.value);
}

function buildSocialMix(entries: EntryRecord[]): InsightPoint[] {
  const aloneHits = sumHits(entries.filter((entry) => entry.alone));
  const sharedHits = sumHits(entries.filter((entry) => !entry.alone));

  return [
    { label: 'Solo', value: aloneHits },
    { label: 'Shared', value: sharedHits },
  ];
}

function buildHeatmap(entries: EntryRecord[]) {
  const buckets = [
    { label: 'Early', startHour: 5, endHour: 9 },
    { label: 'Midday', startHour: 10, endHour: 14 },
    { label: 'Afternoon', startHour: 15, endHour: 18 },
    { label: 'Evening', startHour: 19, endHour: 22 },
    { label: 'Late', startHour: 23, endHour: 4 },
  ];

  return buckets.map((bucket) => {
    const value = sumHits(
      entries.filter((entry) => {
        const hour = new Date(entry.occurredAt).getHours();

        if (bucket.startHour <= bucket.endHour) {
          return hour >= bucket.startHour && hour <= bucket.endHour;
        }

        return hour >= bucket.startHour || hour <= bucket.endHour;
      }),
    );

    return {
      label: bucket.label,
      value,
    };
  });
}

export function buildInsights(
  entries: EntryRecord[],
  goalPlan: GoalPlan | null,
  anchor = new Date(),
): InsightSeries {
  const goalSummary = buildGoalProgressSummary(entries, goalPlan, anchor);

  return {
    weeklyHits: buildWeeklyTrend(entries, anchor),
    monthlyHits: buildWindowTrend(entries, 30, anchor),
    sessionsByDay: buildSessionTrend(entries, 7, anchor),
    typeMix: buildTypeMix(entries),
    socialMix: buildSocialMix(entries),
    heatmap: buildHeatmap(entries),
    currentWeekHits: goalSummary.currentWeekHits,
    goalTargetHits: goalSummary.targetHits,
    goalProgress: goalSummary.progressRatio,
  };
}
