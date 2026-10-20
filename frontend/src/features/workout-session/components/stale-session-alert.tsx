import { Alert } from '@/shared/ui/alert';
import { workoutCopy } from '@/features/workout-session/copy';
import { staleSessionDays } from '@/features/workout-session/lib/stale-session';

export function StaleSessionAlert({ startedAt }: { startedAt: string }) {
  return (
    <Alert>
      <p className="font-medium">
        {workoutCopy.focus.staleSession(staleSessionDays(startedAt))}
      </p>
    </Alert>
  );
}
