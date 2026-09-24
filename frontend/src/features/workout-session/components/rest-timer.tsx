import { Button } from '@/shared/ui/button';
import { workoutCopy } from '@/features/workout-session/copy';
import { formatRestRemaining } from '@/features/workout-session/lib/formatters';

export function RestTimer({
  remainingSeconds,
  complete,
  onSkip,
}: {
  remainingSeconds: number;
  complete: boolean;
  onSkip: () => void;
}) {
  const remaining = formatRestRemaining(remainingSeconds);
  const label = complete
    ? workoutCopy.focus.restDone
    : `${workoutCopy.focus.restRemaining} ${remaining}`;

  return (
    <section
      className="client-surface-card space-y-4 text-center"
      aria-labelledby="rest-timer-label"
    >
      <p id="rest-timer-label" className="text-sm font-medium text-muted-foreground">
        {complete ? workoutCopy.focus.restDone : workoutCopy.focus.restRemaining}
      </p>
      <p
        role="timer"
        aria-live="polite"
        aria-atomic="true"
        aria-label={label}
        className="text-numeric-display text-foreground"
      >
        {remaining}
      </p>
      <Button variant="outline" className="min-h-12 w-full" onClick={onSkip}>
        {complete ? workoutCopy.focus.continueAfterRest : workoutCopy.focus.skipRest}
      </Button>
    </section>
  );
}
