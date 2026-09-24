import { useEffect, useState } from 'react';
import {
  remainingRestSeconds,
  type RestTimerSnapshot,
} from '@/features/workout-session/lib/rest-timer';

export function useRestTimer() {
  const [snapshot, setSnapshot] = useState<RestTimerSnapshot | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (snapshot === null) {
      return;
    }

    const tick = () => {
      setNowMs(Date.now());
    };

    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [snapshot]);

  const remainingSeconds = remainingRestSeconds(snapshot, nowMs);

  return {
    isResting: snapshot !== null && remainingSeconds > 0,
    isComplete: snapshot !== null && remainingSeconds === 0,
    remainingSeconds,
    start(seconds: number) {
      if (seconds <= 0) {
        setSnapshot(null);
        return;
      }
      const startedAtMs = Date.now();
      setNowMs(startedAtMs);
      setSnapshot({ durationSeconds: seconds, startedAtMs });
    },
    skip() {
      setSnapshot(null);
    },
  };
}
