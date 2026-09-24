import { Link } from '@tanstack/react-router';
import type { BodyMeasurementResponseDto } from '@/generated/models';
import { LazyProgressChart } from '@/features/client-progress/charts/lazy-progress-chart';
import { Metric } from '@/features/client-progress/components/metric';
import { clientProgressCopy } from '@/features/client-progress/copy';
import { summarizeBodyTrend, factualWeightCopy } from '@/features/client-progress/lib/body-trend';
import { bodyWeightPoints } from '@/features/client-progress/lib/chart-points';
import {
  formatIsoDate,
  formatKg,
  formatSignedChange,
  formatCm,
} from '@/features/client-progress/lib/formatters';

export function BodyProgressSection({
  measurements,
}: {
  measurements: BodyMeasurementResponseDto[];
}) {
  const trend = summarizeBodyTrend(measurements);
  const points = bodyWeightPoints(measurements);
  const latestWeight = trend.latestWeight != null ? formatKg(trend.latestWeight) : null;
  const weightChange =
    trend.weightChangeKg != null ? formatSignedChange(trend.weightChangeKg, 'kg') : null;
  const latestWaist = trend.latestWaistCm != null ? formatCm(trend.latestWaistCm) : null;
  const waistChange =
    trend.waistChangeCm != null ? formatSignedChange(trend.waistChangeCm, 'cm') : null;
  const latestDate = trend.latest ? formatIsoDate(trend.latest.measuredAt, 'd MMM yyyy') : null;
  const firstWeightPoint = points[0];
  const lastWeightPoint = points[points.length - 1];
  const firstWeightDate = firstWeightPoint
    ? formatIsoDate(firstWeightPoint.date, 'd MMM')
    : null;
  const lastWeightDate = lastWeightPoint
    ? formatIsoDate(lastWeightPoint.date, 'd MMM')
    : null;
  const summary = factualWeightCopy(trend.weightChangeKg, firstWeightDate, lastWeightDate);

  return (
    <section className="client-surface-card space-y-5" aria-labelledby="progress-body-heading">
      <div>
        <h2
          id="progress-body-heading"
          className="text-base font-semibold tracking-tight text-foreground"
        >
          {clientProgressCopy.body.title}
        </h2>
        <p className="mt-1 text-sm leading-snug text-muted-foreground">
          {measurements.length === 0
            ? clientProgressCopy.body.empty
            : latestDate
              ? `${clientProgressCopy.body.latest} ${latestDate}`
              : clientProgressCopy.body.description}
        </p>
      </div>

      {measurements.length === 0 ? (
        <p className="text-sm text-muted-foreground">{clientProgressCopy.body.emptyHint}</p>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-y-5">
            <Metric
              label={clientProgressCopy.body.weight}
              value={latestWeight ?? '—'}
              hint={
                points.length < 2
                  ? clientProgressCopy.body.onePoint
                  : weightChange
                    ? `${clientProgressCopy.body.change} ${weightChange}`
                    : null
              }
              quiet={!latestWeight}
            />
            <Metric
              className="border-l border-border/80 pl-4"
              label={clientProgressCopy.body.waist}
              value={latestWaist ?? '—'}
              hint={waistChange ? `${clientProgressCopy.body.change} ${waistChange}` : null}
              quiet={!latestWaist}
            />
          </dl>
          {summary ? (
            <p className="text-sm leading-relaxed text-muted-foreground">{summary}</p>
          ) : null}
          <LazyProgressChart
            points={points}
            label={clientProgressCopy.body.chartLabel}
            summary={clientProgressCopy.body.chartSummary}
          />
        </>
      )}

      <Link
        to="/client/body"
        className="inline-flex min-h-11 items-center text-sm font-medium text-primary"
      >
        {clientProgressCopy.body.viewBody}
      </Link>
    </section>
  );
}
