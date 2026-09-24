import type { ProgressSessionHistoryItemDto } from '@/generated/models';
import { clientProgressCopy } from '@/features/client-progress/copy';
import {
  formatDurationSeconds,
  formatIsoDate,
  formatKg,
} from '@/features/client-progress/lib/formatters';

export function ExerciseHistoryList({
  sessions,
}: {
  sessions: ProgressSessionHistoryItemDto[];
}) {
  if (sessions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{clientProgressCopy.detail.noHistory}</p>
    );
  }

  return (
    <ol className="space-y-4">
      {sessions.map((session) => {
        const performed = formatIsoDate(session.performedAt, 'd MMM yyyy');
        return (
          <li key={session.workoutSessionId} className="border-t border-border/80 pt-4 first:border-t-0 first:pt-0">
            <p className="font-medium text-foreground">{session.workoutName}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {performed}
              {session.sessionExternalLoadVolumeKg != null
                ? ` · ${formatKg(session.sessionExternalLoadVolumeKg)}`
                : null}
              {session.totalDurationSeconds != null
                ? ` · ${formatDurationSeconds(session.totalDurationSeconds)}`
                : null}
            </p>
            <ul className="mt-3 space-y-1.5">
              {session.occurrences.flatMap((occurrence) =>
                occurrence.sets.map((set) => (
                  <li
                    key={set.id}
                    className="text-numeric flex justify-between gap-3 text-sm text-foreground"
                  >
                    <span className="text-muted-foreground">
                      {clientProgressCopy.detail.set} {set.setNumber}
                    </span>
                    <span>
                      {set.actualLoadKg != null ? formatKg(set.actualLoadKg) : null}
                      {set.actualReps != null ? ` × ${set.actualReps}` : null}
                      {set.actualDurationSeconds != null
                        ? formatDurationSeconds(set.actualDurationSeconds)
                        : null}
                    </span>
                  </li>
                )),
              )}
            </ul>
          </li>
        );
      })}
    </ol>
  );
}
