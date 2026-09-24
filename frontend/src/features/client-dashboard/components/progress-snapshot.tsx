import { Link } from '@tanstack/react-router';
import { BarChart3 } from 'lucide-react';
import type {
  ClientDashboardBodyProgressDto,
  ClientDashboardPerformanceDto,
} from '@/generated/models';
import { DashboardCard } from '@/features/client-dashboard/components/dashboard-card';
import { clientDashboardCopy } from '@/features/client-dashboard/copy';
import {
  formatCm,
  formatCompactNumber,
  formatDurationSeconds,
  formatIsoDate,
  formatKg,
  formatSignedChange,
} from '@/features/client-dashboard/lib/formatters';
import { cn } from '@/shared/lib/utils';

export function ProgressSnapshot({
  performance,
  bodyProgress,
}: {
  performance: ClientDashboardPerformanceDto;
  bodyProgress: ClientDashboardBodyProgressDto | null | undefined;
}) {
  const duration = formatDurationSeconds(performance.totalDurationSeconds);
  const volume = formatKg(performance.externalLoadVolumeKg);

  return (
    <DashboardCard aria-labelledby="progress-snapshot-heading">
      <div className="flex items-start gap-2.5">
        <BarChart3
          className="mt-0.5 size-4 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
        <div>
          <h2
            id="progress-snapshot-heading"
            className="text-base font-semibold tracking-tight text-foreground"
          >
            {clientDashboardCopy.progress.title}
          </h2>
          <p className="mt-1 text-sm leading-snug text-muted-foreground">
            {clientDashboardCopy.progress.description}
          </p>
        </div>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-y-5">
        <Metric
          label={clientDashboardCopy.progress.sessions}
          value={formatCompactNumber(performance.completedSessions)}
          quiet={performance.completedSessions === 0}
        />
        <Metric
          className="border-l border-border/80 pl-4"
          label={clientDashboardCopy.progress.sets}
          value={formatCompactNumber(performance.performedSets)}
          quiet={performance.performedSets === 0}
        />
        {volume ? (
          <Metric
            className="pt-1"
            label={clientDashboardCopy.progress.volume}
            value={volume}
            quiet={performance.externalLoadVolumeKg === 0}
          />
        ) : null}
        {duration ? (
          <Metric
            className="border-l border-border/80 pl-4 pt-1"
            label={clientDashboardCopy.progress.duration}
            value={duration}
            quiet={performance.totalDurationSeconds === 0}
          />
        ) : null}
      </dl>

      <BodyProgressBlock bodyProgress={bodyProgress} />

      <Link
        to="/client/progress"
        search={{ period: 30 }}
        className="mt-5 inline-flex min-h-11 items-center text-sm font-medium text-primary"
      >
        {clientDashboardCopy.progress.viewProgress}
      </Link>
    </DashboardCard>
  );
}

function Metric({
  label,
  value,
  quiet,
  className,
}: {
  label: string;
  value: string;
  quiet?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1.5 pr-4', className)}>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          'text-numeric text-[1.65rem] font-medium leading-none tracking-tight',
          quiet ? 'text-muted-foreground' : 'text-foreground',
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function BodyProgressBlock({
  bodyProgress,
}: {
  bodyProgress: ClientDashboardBodyProgressDto | null | undefined;
}) {
  if (!bodyProgress) {
    return null;
  }

  const measured = formatIsoDate(bodyProgress.measuredAt, 'd MMM yyyy');
  const weight = bodyProgress.bodyWeightKg != null ? formatKg(bodyProgress.bodyWeightKg) : null;
  const weightChange =
    bodyProgress.bodyWeightChangeKg != null
      ? formatSignedChange(bodyProgress.bodyWeightChangeKg, 'kg')
      : null;
  const waist = bodyProgress.waistCm != null ? formatCm(bodyProgress.waistCm) : null;
  const waistChange =
    bodyProgress.waistChangeCm != null
      ? formatSignedChange(bodyProgress.waistChangeCm, 'cm')
      : null;
  const hasMeasurement = Boolean(weight || waist);

  return (
    <div className="mt-6 border-t border-border/80 pt-5">
      <h3 className="text-sm font-semibold text-foreground">
        {clientDashboardCopy.progress.bodyTitle}
      </h3>
      {measured ? (
        <p className="mt-1 text-sm text-muted-foreground">{measured}</p>
      ) : null}

      {hasMeasurement ? (
        <dl className="mt-3 space-y-2 text-sm">
          {weight ? (
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{clientDashboardCopy.progress.weight}</dt>
              <dd className="text-numeric text-foreground">
                {weight}
                {weightChange ? ` (${weightChange})` : ''}
              </dd>
            </div>
          ) : null}
          {waist ? (
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{clientDashboardCopy.progress.waist}</dt>
              <dd className="text-numeric text-foreground">
                {waist}
                {waistChange ? ` (${waistChange})` : ''}
              </dd>
            </div>
          ) : null}
        </dl>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          {clientDashboardCopy.progress.noBody}
        </p>
      )}

      <p className="mt-3 text-sm text-muted-foreground">
        {bodyProgress.progressPhotoCount > 0
          ? `${formatCompactNumber(bodyProgress.progressPhotoCount)} ${clientDashboardCopy.progress.photos.toLowerCase()}`
          : clientDashboardCopy.progress.photosEmpty}
      </p>
    </div>
  );
}
