import { Card, SectionHeading } from '@/components/ui/primitives';
import { cn } from '@/lib/utils';
import { type InsightPoint } from '@/types/models';

export function BarChartCard({
  title,
  description,
  points,
}: {
  title: string;
  description: string;
  points: InsightPoint[];
}) {
  const maxValue = Math.max(...points.map((point) => point.value), 1);

  return (
    <Card className="space-y-4">
      <SectionHeading title={title} description={description} />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(1.5rem,1fr))] gap-3">
        {points.map((point) => (
          <div key={point.label} className="space-y-2 text-center">
            <div className="flex h-28 items-end justify-center rounded-[1.25rem] bg-secondary/60 p-2">
              <div
                className="w-full rounded-full bg-primary/90 transition-all duration-300"
                style={{
                  height: `${Math.max((point.value / maxValue) * 100, point.value > 0 ? 14 : 4)}%`,
                }}
              />
            </div>
            <p className="text-[0.7rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {point.label}
            </p>
            <p className="text-sm font-semibold text-foreground">{point.value}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function DonutChartCard({
  title,
  description,
  points,
}: {
  title: string;
  description: string;
  points: InsightPoint[];
}) {
  const total = Math.max(
    points.reduce((sum, point) => sum + point.value, 0),
    1,
  );
  const colors = [
    'var(--chart-1)',
    'var(--chart-2)',
    'var(--chart-3)',
    'var(--chart-4)',
    'var(--chart-5)',
  ];
  let cumulative = 0;

  return (
    <Card className="space-y-5">
      <SectionHeading title={title} description={description} />
      <div className="grid items-center gap-4 sm:grid-cols-[9rem,1fr]">
        <svg
          viewBox="0 0 120 120"
          className="mx-auto h-36 w-36 -rotate-90"
          role="img"
          aria-label={title}
        >
          <circle cx="60" cy="60" r="42" fill="none" stroke="var(--secondary)" strokeWidth="18" />
          {points.map((point, index) => {
            const fraction = point.value / total;
            const dashArray = `${fraction * 264} 264`;
            const dashOffset = -cumulative * 264;
            cumulative += fraction;

            return (
              <circle
                key={point.label}
                cx="60"
                cy="60"
                r="42"
                fill="none"
                stroke={colors[index % colors.length]}
                strokeWidth="18"
                strokeDasharray={dashArray}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
              />
            );
          })}
          <text
            x="60"
            y="58"
            textAnchor="middle"
            className="fill-foreground text-[0.75rem] font-semibold"
          >
            {total}
          </text>
          <text
            x="60"
            y="72"
            textAnchor="middle"
            className="fill-muted-foreground text-[0.4rem] uppercase tracking-[0.25em]"
          >
            hits
          </text>
        </svg>
        <div className="space-y-3">
          {points.map((point, index) => (
            <div
              key={point.label}
              className="flex items-center justify-between rounded-[1rem] bg-secondary/50 px-3 py-2"
            >
              <div className="flex items-center gap-3">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: colors[index % colors.length] }}
                />
                <p className="text-sm text-foreground">{point.label}</p>
              </div>
              <p className="text-sm font-semibold text-foreground">{point.value}</p>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

export function HeatmapCard({
  title,
  description,
  points,
}: {
  title: string;
  description: string;
  points: InsightPoint[];
}) {
  const maxValue = Math.max(...points.map((point) => point.value), 1);

  return (
    <Card className="space-y-4">
      <SectionHeading title={title} description={description} />
      <div className="grid grid-cols-5 gap-3">
        {points.map((point) => {
          const intensity = point.value / maxValue;

          return (
            <div
              key={point.label}
              className="space-y-2 rounded-[1.25rem] border border-border/70 p-3"
            >
              <div
                className="h-14 rounded-[1rem]"
                style={{
                  background: `color-mix(in oklab, var(--chart-2) ${Math.round(
                    18 + intensity * 72,
                  )}%, var(--background))`,
                }}
              />
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {point.label}
              </p>
              <p className="text-sm font-semibold text-foreground">{point.value}</p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export function StatCard({
  title,
  value,
  hint,
  accent = false,
}: {
  title: string;
  value: string;
  hint: string;
  accent?: boolean;
}) {
  return (
    <Card
      className={cn(
        'space-y-2',
        accent && 'border-primary/40 bg-primary/10 shadow-[0_18px_60px_-42px_rgba(17,92,64,0.8)]',
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
        {title}
      </p>
      <p className="text-3xl font-semibold tracking-tight text-foreground">{value}</p>
      <p className="text-sm leading-6 text-muted-foreground">{hint}</p>
    </Card>
  );
}
