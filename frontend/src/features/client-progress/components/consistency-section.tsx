import type { ProgressSummaryResponseDto } from '@/generated/models';
import { Metric } from '@/features/client-progress/components/metric';
import { clientProgressCopy } from '@/features/client-progress/copy';
import {
  formatCompactNumber,
  formatCountLabel,
  formatDurationSeconds,
} from '@/features/client-progress/lib/formatters';

export function ConsistencySection({ current }: { current: ProgressSummaryResponseDto }) {
  const empty = current.performedSets === 0;
  const duration = formatDurationSeconds(current.totalDurationSeconds) ?? '0 min';

  return (
    <section className="client-surface-card space-y-5" aria-labelledby="progress-consistency-heading">
      <div>
        <h2
          id="progress-consistency-heading"
          className="text-base font-semibold tracking-tight text-foreground"
        >
          {clientProgressCopy.consistency.title}
        </h2>
        <p className="mt-1 text-sm leading-snug text-muted-foreground">
          {empty
            ? clientProgressCopy.consistency.empty
            : clientProgressCopy.consistency.description}
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-y-5">
        <Metric
          label={clientProgressCopy.consistency.sets}
          value={formatCompactNumber(current.performedSets)}
          quiet={empty}
        />
        <Metric
          className="border-l border-border/80 pl-4"
          label={clientProgressCopy.consistency.reps}
          value={formatCompactNumber(current.totalReps)}
          quiet={current.totalReps === 0}
        />
        <Metric
          className="pt-1"
          label={clientProgressCopy.consistency.duration}
          value={duration}
          quiet={current.totalDurationSeconds === 0}
        />
        <Metric
          className="border-l border-border/80 pl-4 pt-1"
          label={clientProgressCopy.consistency.exercises}
          value={formatCountLabel(current.exercisesPerformed, 'exercise', 'exercises')}
          quiet={current.exercisesPerformed === 0}
        />
      </dl>
    </section>
  );
}
