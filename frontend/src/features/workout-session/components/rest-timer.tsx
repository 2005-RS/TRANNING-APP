import { Check } from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from '@/shared/ui/button';
import { workoutCopy } from '@/features/workout-session/copy';
import { formatRestRemaining } from '@/features/workout-session/lib/formatters';
import { motionTransition, useReducedMotion } from '@/shared/lib/motion';
import { cn } from '@/shared/lib/utils';

export function RestTimer({
  remainingSeconds,
  complete,
  onSkip,
}: {
  remainingSeconds: number;
  complete: boolean;
  onSkip: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const remaining = formatRestRemaining(remainingSeconds);
  const label = complete
    ? workoutCopy.focus.restDone
    : `${workoutCopy.focus.restRemaining} ${remaining}`;

  return (
    <section
      className="client-surface-card space-y-4 text-center"
      aria-labelledby="rest-timer-label"
    >
      <p
        id="rest-timer-label"
        className={cn(
          'inline-flex items-center justify-center gap-2 text-sm font-medium',
          complete ? 'text-success' : 'text-muted-foreground',
        )}
      >
        {complete ? <Check className="size-4" aria-hidden /> : null}
        {complete ? workoutCopy.focus.restDone : workoutCopy.focus.restRemaining}
      </p>
      <motion.p
        key={complete ? 'rest-done' : 'rest-tick'}
        role="timer"
        aria-live="polite"
        aria-atomic="true"
        aria-label={label}
        className={cn(
          'text-numeric-display',
          complete ? 'text-success' : 'text-foreground',
        )}
        initial={reduceMotion || !complete ? false : { scale: 0.96, opacity: 0.85 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={motionTransition('instant', reduceMotion)}
      >
        {remaining}
      </motion.p>
      <Button variant="outline" className="min-h-12 w-full" onClick={onSkip}>
        {complete ? workoutCopy.focus.continueAfterRest : workoutCopy.focus.skipRest}
      </Button>
    </section>
  );
}
