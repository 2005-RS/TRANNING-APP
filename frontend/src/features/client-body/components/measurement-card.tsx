import type { BodyMeasurementResponseDto } from '@/generated/models';
import { clientBodyCopy } from '@/features/client-body/copy';
import { BODY_METRIC_FIELDS, metricUnit } from '@/features/client-body/lib/metric-fields';
import { formatBodyFat, formatCm, formatKg, formatMeasuredAt } from '@/features/client-body/lib/formatters';
import { Button } from '@/shared/ui/button';

function formatMetric(field: (typeof BODY_METRIC_FIELDS)[number], value: unknown): string | null {
  const unit = metricUnit(field);
  if (unit === 'kg') {
    return formatKg(value);
  }
  if (unit === '%') {
    return formatBodyFat(value);
  }
  return formatCm(value);
}

export function MeasurementCard({
  measurement,
  latest = false,
  onEdit,
}: {
  measurement: BodyMeasurementResponseDto;
  latest?: boolean;
  onEdit: (measurement: BodyMeasurementResponseDto) => void;
}) {
  const when = formatMeasuredAt(measurement.measuredAt);
  const metrics = BODY_METRIC_FIELDS.flatMap((field) => {
    const formatted = formatMetric(field, measurement[field] ?? null);
    return formatted ? [{ field, formatted, label: clientBodyCopy.metrics[field] }] : [];
  });

  return (
    <article className="client-surface-card space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          {latest ? (
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {clientBodyCopy.measurements.latest}
            </p>
          ) : null}
          <h3 className="text-base font-semibold tracking-tight">
            {when ?? clientBodyCopy.measurements.history}
          </h3>
        </div>
        <Button variant="outline" className="min-h-11 shrink-0" onClick={() => onEdit(measurement)}>
          {clientBodyCopy.measurements.edit}
        </Button>
      </div>
      {metrics.length > 0 ? (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 min-[430px]:grid-cols-3">
          {metrics.map((metric) => (
            <div key={metric.field} className="min-w-0">
              <dt className="text-xs font-medium text-muted-foreground">{metric.label}</dt>
              <dd className="text-numeric mt-1 text-base font-medium">{metric.formatted}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {measurement.notes ? (
        <p className="text-sm leading-relaxed text-muted-foreground">{measurement.notes}</p>
      ) : null}
    </article>
  );
}
