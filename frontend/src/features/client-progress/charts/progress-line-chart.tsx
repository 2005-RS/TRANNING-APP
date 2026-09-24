import { useId, useMemo } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { yAxisDomain, type ChartPoint } from '@/features/client-progress/lib/chart-points';
import { formatDecimal, formatDurationSeconds, formatIsoDate } from '@/features/client-progress/lib/formatters';
import { chartColors, prefersReducedMotion } from '@/features/client-progress/charts/chart-theme';

function formatTooltipValue(value: number, unit: string): string {
  if (unit === 'sec') {
    return formatDurationSeconds(value) ?? `${formatDecimal(value) ?? value} sec`;
  }
  const amount = formatDecimal(value);
  return amount ? `${amount} ${unit}` : `${value} ${unit}`;
}

export function ProgressLineChart({
  points,
  label,
  summary,
}: {
  points: ChartPoint[];
  label: string;
  summary: string;
}) {
  const headingId = useId();
  const colors = useMemo(() => chartColors(), []);
  const animate = !prefersReducedMotion();
  const unit = points[0]?.unit ?? '';

  if (points.length < 2) {
    return null;
  }

  return (
    <figure className="mt-4" aria-labelledby={headingId}>
      <figcaption id={headingId} className="sr-only">
        {summary}
      </figcaption>
      <div className="h-44 w-full min-w-0 sm:h-52" role="img" aria-label={label}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={colors.grid} strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: colors.tick, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              minTickGap={28}
            />
            <YAxis
              domain={yAxisDomain(points)}
              tick={{ fill: colors.tick, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={44}
              tickFormatter={(value: number) =>
                unit === 'sec' ? String(Math.round(value / 60)) : (formatDecimal(value) ?? String(value))
              }
            />
            <Tooltip
              cursor={{ stroke: colors.grid }}
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) {
                  return null;
                }
                const point = payload[0].payload as ChartPoint;
                return (
                  <div
                    className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground shadow-md"
                    style={{ minWidth: '8.5rem' }}
                  >
                    <p className="text-muted-foreground">
                      {formatIsoDate(point.date, 'd MMM yyyy') ?? point.label}
                    </p>
                    <p className="text-numeric mt-1 font-medium">
                      {formatTooltipValue(point.value, point.unit)}
                    </p>
                  </div>
                );
              }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={colors.line}
              strokeWidth={2}
              dot={{ r: 3, strokeWidth: 0, fill: colors.line }}
              activeDot={{ r: 6 }}
              isAnimationActive={animate}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}

export default ProgressLineChart;
