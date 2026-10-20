import { useEffect, useRef } from 'react';
import { Button } from '@/shared/ui/button';
import { formatRestRemaining } from '@/features/workout-session/lib/formatters';
import { workoutCopy } from '@/features/workout-session/copy';

export function RestBar({
  remainingSeconds,
  durationSeconds,
  onAdjust,
  onSkip,
}: {
  remainingSeconds: number;
  durationSeconds: number;
  onAdjust: (seconds: number) => void;
  onSkip: () => void;
}) {
  const announced = useRef(false);
  const progress = durationSeconds
    ? Math.min(100, (remainingSeconds / durationSeconds) * 100)
    : 0;

  useEffect(() => {
    if (remainingSeconds === 0 && !announced.current) {
      navigator.vibrate?.(200);
      announced.current = true;
    }
  }, [remainingSeconds]);

  return (
    <aside
      className={
        'fixed inset-x-0 bottom-0 z-[var(--z-workout-focus)] border-t border-border ' +
        'bg-card p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-lg'
      }
      aria-live="polite"
    >
      <div className="mx-auto flex max-w-lg items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{workoutCopy.focus.restRemaining}</p>
          <p className="text-numeric text-xl" role="timer">
            {formatRestRemaining(remainingSeconds)}
          </p>
          <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted">
            <div
              className={
                'h-full bg-primary transition-[width] duration-[var(--motion-instant)] ' +
                'motion-reduce:transition-none'
              }
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <Button
          variant="outline"
          className="min-h-11"
          onClick={() => onAdjust(-15)}
        >
          {workoutCopy.focus.restSubtract15}
        </Button>
        <Button
          variant="outline"
          className="min-h-11"
          onClick={() => onAdjust(15)}
        >
          {workoutCopy.focus.restAdd15}
        </Button>
        <Button className="min-h-11" onClick={onSkip}>
          {workoutCopy.focus.skipRest}
        </Button>
      </div>
    </aside>
  );
}
