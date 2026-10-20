import { useEffect, useState } from 'react';
import { Button } from '@/shared/ui/button';
import { formatElapsed } from '@/features/workout-session/lib/formatters';
import { workoutCopy } from '@/features/workout-session/copy';

export function SessionHeader({
  workoutName,
  startedAt,
  recorded,
  total,
  canFinish,
  pending,
  onFinish,
}: {
  workoutName: string;
  startedAt: string;
  recorded: number;
  total: number;
  canFinish: boolean;
  pending: boolean;
  onFinish: () => void;
}) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const tick = () => {
      if (!document.hidden) {
        setNow(Date.now());
      }
    };
    const id = window.setInterval(tick, 1000);
    document.addEventListener('visibilitychange', tick);

    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, []);

  const elapsed = Math.max(
    0,
    Math.floor((now - Date.parse(startedAt)) / 1000),
  );
  return (
    <header
      className={
        'sticky top-0 z-[var(--z-sticky)] -mx-4 border-b border-border ' +
        'bg-background/95 px-4 py-3 backdrop-blur-sm'
      }
    >
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold">{workoutName}</h1>
          <p className="text-numeric text-xs text-muted-foreground">
            {formatElapsed(elapsed)} · {workoutCopy.focus.progress(recorded, total)}
          </p>
        </div>
        <Button
          className="min-h-11 shrink-0"
          disabled={!canFinish || pending}
          title={!canFinish ? workoutCopy.focus.completeNeedSets : undefined}
          onClick={onFinish}
        >
          {workoutCopy.focus.complete}
        </Button>
      </div>
      {!canFinish ? (
        <p className="mt-1 text-xs text-muted-foreground">
          {workoutCopy.focus.completeNeedSets}
        </p>
      ) : null}
    </header>
  );
}
