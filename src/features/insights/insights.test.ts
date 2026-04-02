import { describe, expect, it } from 'vitest';

import { buildInsights } from '@/features/insights/insights';
import { nowIso } from '@/lib/time';
import { type EntryRecord, type GoalPlan } from '@/types/models';

function buildEntry(partial: Partial<EntryRecord>): EntryRecord {
  const now = nowIso();

  return {
    id: crypto.randomUUID(),
    occurredAt: now,
    type: 'flower',
    alone: true,
    amountHits: 2,
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

describe('buildInsights', () => {
  it('summarizes type, social, and goal progress data', () => {
    const entries = [
      buildEntry({
        occurredAt: new Date('2026-03-31T19:00:00.000Z').toISOString(),
        type: 'flower',
        amountHits: 2,
        alone: true,
      }),
      buildEntry({
        occurredAt: new Date('2026-04-01T02:00:00.000Z').toISOString(),
        type: 'edible',
        amountHits: 4,
        alone: false,
      }),
    ];
    const goalPlan: GoalPlan = {
      id: 'goal-1',
      baselineDays: 7,
      weeklyTargetHits: 10,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };

    const insights = buildInsights(entries, goalPlan, new Date('2026-04-01T12:00:00.000Z'));

    expect(insights.currentWeekHits).toBe(6);
    expect(insights.goalProgress).toBe(0.6);
    expect(insights.typeMix.find((point) => point.label === 'edible')?.value).toBe(4);
    expect(insights.socialMix.find((point) => point.label === 'Shared')?.value).toBe(4);
    expect(insights.sessionsByDay.reduce((sum, point) => sum + point.value, 0)).toBe(2);
  });
});
