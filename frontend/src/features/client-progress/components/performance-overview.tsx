import type { ProgressSummaryResponseDto } from '@/generated/models';
import { Metric } from '@/features/client-progress/components/metric';
import { clientProgressCopy } from '@/features/client-progress/copy';
import {
  formatCountLabel,
  formatIsoDate,
  formatPercent,
  formatVolumeKg,
} from '@/features/client-progress/lib/formatters';
import { percentChange } from '@/features/client-progress/lib/percent-change';

export function PerformanceOverview({
  current,
  previous,
}: {
  current: ProgressSummaryResponseDto;
  previous: ProgressSummaryResponseDto | undefined;
}) {
  const volume = formatVolumeKg(current.externalLoadVolumeKg) ?? '0 kg';
  const volumeChange = previous
    ? percentChange(current.externalLoadVolumeKg, previous.externalLoadVolumeKg)
    : null;
  const sessionChange = previous
    ? percentChange(current.completedSessions, previous.completedSessions)
    : null;
  const lastSession = current.lastCompletedSessionAt
    ? formatIsoDate(current.lastCompletedSessionAt, 'd MMM yyyy')
    : null;
  const firstSession = current.firstCompletedSessionAt
    ? formatIsoDate(current.firstCompletedSessionAt, 'd MMM yyyy')
    : null;
  const empty = current.completedSessions === 0;

  return (
    <section className="client-surface-card space-y-5" aria-labelledby="progress-overview-heading">
      <div>
        <h2
          id="progress-overview-heading"
          className="text-base font-semibold tracking-tight text-foreground"
        >
          {clientProgressCopy.overview.title}
        </h2>
        <p className="mt-1 text-sm leading-snug text-muted-foreground">
          {empty
            ? clientProgressCopy.overview.emptyHint
            : lastSession
              ? `${clientProgressCopy.overview.lastSession} ${lastSession}`
              : clientProgressCopy.overview.title}
        </p>
      </div>

      <div>
        <p className="text-xs font-medium text-muted-foreground">
          {clientProgressCopy.overview.volume}
        </p>
        <p
          className={`text-numeric-display mt-2 ${empty ? 'text-muted-foreground' : 'text-foreground'}`}
        >
          {volume}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {volumeChange == null
            ? clientProgressCopy.overview.noComparison
            : `${formatPercent(volumeChange)} ${clientProgressCopy.overview.vsPrevious}`}
        </p>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          {clientProgressCopy.overview.volumeHint}
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-y-5">
        <Metric
          label={clientProgressCopy.overview.sessions}
          value={formatCountLabel(current.completedSessions, 'session', 'sessions')}
          hint={
            sessionChange == null
              ? null
              : `${formatPercent(sessionChange)} ${clientProgressCopy.overview.vsPrevious}`
          }
          quiet={empty}
        />
        <Metric
          className="border-l border-border/80 pl-4"
          label={clientProgressCopy.overview.firstSession}
          value={firstSession ?? '—'}
          quiet={!firstSession}
        />
      </dl>
    </section>
  );
}
