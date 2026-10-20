import type { WorkoutPreviousSetDto, WorkoutSetResponseDto } from '@/generated/models';

export function isPersonalRecord(
  set: Pick<WorkoutSetResponseDto, 'actualLoadKg' | 'actualReps'>,
  previousSets: WorkoutPreviousSetDto[],
): boolean {
  const load = set.actualLoadKg ?? 0;
  const reps = set.actualReps ?? 0;
  const maxLoad = Math.max(0, ...previousSets.map((item) => item.actualLoadKg ?? 0));
  if (maxLoad > 0 && load > maxLoad) return true;

  const maxRepsAtLoad = Math.max(
    0,
    ...previousSets
      .filter((item) => (item.actualLoadKg ?? 0) <= load)
      .map((item) => item.actualReps ?? 0),
  );
  return maxRepsAtLoad > 0 && reps > maxRepsAtLoad;
}
