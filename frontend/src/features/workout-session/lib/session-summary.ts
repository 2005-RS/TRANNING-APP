import type { WorkoutSessionResponseDto } from '@/generated/models';

export function sessionSummary(session: WorkoutSessionResponseDto) {
  const completedAt = session.completedAt ? Date.parse(session.completedAt) : Date.now();
  const startedAt = Date.parse(session.startedAt);
  const durationSeconds = Number.isFinite(startedAt)
    ? Math.max(0, Math.floor((completedAt - startedAt) / 1000))
    : 0;
  const sets = session.exercises.flatMap((exercise) => exercise.sets);
  return {
    durationSeconds,
    totalSets: sets.length,
    totalVolume: sets.reduce(
      (total, set) => total + (set.actualLoadKg ?? 0) * (set.actualReps ?? 0),
      0,
    ),
    exercisesDone: session.exercises.filter((exercise) => exercise.sets.length > 0).length,
  };
}
