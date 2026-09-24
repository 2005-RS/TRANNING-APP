import { Activity, Check } from 'lucide-react';
import type { ClientDashboardCompletedSessionDto } from '@/generated/models';
import { DashboardCard } from '@/features/client-dashboard/components/dashboard-card';
import { clientDashboardCopy } from '@/features/client-dashboard/copy';
import {
  formatCountLabel,
  formatIsoDate,
} from '@/features/client-dashboard/lib/formatters';
import {
  trainedDayCount,
  weekDayMarkers,
} from '@/features/client-dashboard/lib/week-activity';
import { CLIENT_DASHBOARD_PERIOD_DAYS } from '@/features/client-dashboard/lib/query-policy';
import { cn } from '@/shared/lib/utils';

export function WeeklyActivityCard({
  completedSessions,
}: {
  completedSessions: ClientDashboardCompletedSessionDto[];
}) {
  const markers = weekDayMarkers(completedSessions);
  const trained = trainedDayCount(markers);

  return (
    <DashboardCard aria-labelledby="weekly-activity-heading">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <Activity className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div>
            <h2
              id="weekly-activity-heading"
              className="text-base font-semibold tracking-tight text-foreground"
            >
              {clientDashboardCopy.weekly.title}
            </h2>
            <p className="mt-1 text-sm leading-snug text-muted-foreground">
              {clientDashboardCopy.weekly.description}
            </p>
          </div>
        </div>
        <p className="shrink-0 text-right">
          <span
            className={cn(
              'text-numeric block text-2xl font-medium leading-none',
              completedSessions.length === 0 ? 'text-muted-foreground' : 'text-foreground',
            )}
          >
            {completedSessions.length}
          </span>
          <span className="mt-1 block text-xs text-muted-foreground">
            {completedSessions.length === 1
              ? clientDashboardCopy.weekly.session
              : clientDashboardCopy.weekly.sessions}
          </span>
        </p>
      </div>

      <div
        className="mt-6"
        role="img"
        aria-label={`${clientDashboardCopy.weekly.daysTrained}: ${trained} of ${CLIENT_DASHBOARD_PERIOD_DAYS}`}
      >
        <ol className="grid grid-cols-7 gap-1">
          {markers.map((marker) => (
            <li key={marker.key} className="flex flex-col items-center gap-1.5">
              <span
                className={cn(
                  'text-[0.65rem] font-medium leading-none text-muted-foreground',
                  marker.isToday && 'text-foreground',
                )}
              >
                {marker.label}
              </span>
              <span
                className={cn(
                  'flex size-8 items-center justify-center rounded-full border',
                  marker.trained
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-muted/60',
                  marker.isToday && !marker.trained && 'border-foreground ring-2 ring-foreground/25',
                )}
                title={marker.fullLabel}
              >
                {marker.trained ? (
                  <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />
                ) : (
                  <span className="size-1.5 rounded-full bg-muted-foreground/35" aria-hidden="true" />
                )}
              </span>
              <span className="sr-only">
                {marker.fullLabel}:{' '}
                {marker.trained
                  ? clientDashboardCopy.weekly.dayTrained
                  : clientDashboardCopy.weekly.dayRest}
                {marker.isToday ? `, ${clientDashboardCopy.weekly.today}` : ''}
              </span>
            </li>
          ))}
        </ol>
      </div>

      {completedSessions.length === 0 ? (
        <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
          {clientDashboardCopy.weekly.empty}
        </p>
      ) : (
        <ul className="mt-5 divide-y divide-border/80">
          {completedSessions.slice(0, 3).map((session) => {
            const completed = formatIsoDate(session.completedAt);
            return (
              <li
                key={session.id}
                className="flex items-baseline justify-between gap-3 py-2.5 text-sm first:pt-0 last:pb-0"
              >
                <span className="min-w-0 truncate font-medium text-foreground">
                  {session.workoutName}
                </span>
                <span className="shrink-0 text-muted-foreground">
                  {completed ??
                    formatCountLabel(
                      session.performedSetCount,
                      clientDashboardCopy.weekly.set,
                      clientDashboardCopy.weekly.sets,
                    )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </DashboardCard>
  );
}
