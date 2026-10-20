import { Link } from '@tanstack/react-router';
import type { WorkoutSessionResponseDto } from '@/generated/models';
import { sessionSummary } from '@/features/workout-session/lib/session-summary';
import { formatRestRemaining } from '@/features/workout-session/lib/formatters';
import { workoutCopy } from '@/features/workout-session/copy';
import { defaultProgressSearch } from '@/features/client-progress/lib/progress-search';
import { Button } from '@/shared/ui/button';
import { useClientSubscriptionsMe } from '@/generated/subscriptions/subscriptions';
import { SubscriptionResponseDtoPlan } from '@/generated/models';

export function WorkoutSummary({
  session,
  records,
}: {
  session: WorkoutSessionResponseDto;
  records: string[];
}) {
  const summary = sessionSummary(session);
  const subscription = useClientSubscriptionsMe({ query: { retry: false } });
  const showProPrompt = !subscription.isError
    && subscription.data?.plan === SubscriptionResponseDtoPlan.FREE;

  return (
    <section className="client-surface-card space-y-5">
      <h1 className="text-2xl font-semibold">{workoutCopy.focus.completedTitle}</h1>
      <dl className="grid grid-cols-2 gap-3">
        <div>
          <dt className="text-xs text-muted-foreground">
            {workoutCopy.focus.duration}
          </dt>
          <dd className="text-numeric text-lg">
            {formatRestRemaining(summary.durationSeconds)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">
            {workoutCopy.focus.totalSets}
          </dt>
          <dd className="text-numeric text-lg">{summary.totalSets}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">
            {workoutCopy.focus.volume}
          </dt>
          <dd className="text-numeric text-lg">{summary.totalVolume} kg</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">
            {workoutCopy.focus.exercisesDone}
          </dt>
          <dd className="text-numeric text-lg">{summary.exercisesDone}</dd>
        </div>
      </dl>
      {records.length ? (
        <ul className="text-sm">
          <li className="font-medium">{workoutCopy.focus.personalRecords}</li>
          {records.map((record) => (
            <li key={record}>🏆 {record}</li>
          ))}
        </ul>
      ) : null}
      {showProPrompt ? (
        <Link to="/client/plan" className="block text-sm text-muted-foreground underline underline-offset-4">
          {workoutCopy.focus.proSummary}
        </Link>
      ) : null}
      <div className="grid gap-3">
        <Link
          to="/client/progress"
          search={defaultProgressSearch}
          className="min-h-12 text-center font-medium text-primary underline underline-offset-4"
        >
          {workoutCopy.focus.viewProgress}
        </Link>
        <Link to="/client" className="min-h-12">
          <Button className="w-full">{workoutCopy.focus.backHome}</Button>
        </Link>
      </div>
    </section>
  );
}
