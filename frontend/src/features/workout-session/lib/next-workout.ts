import type { TrainingPlanWorkoutResponseDto } from '@/generated/models';

type CompletedSession = {
  sourceTrainingPlanWorkoutId: string;
};

const DAYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

export function nextWorkout(
  workouts: TrainingPlanWorkoutResponseDto[],
  completed: CompletedSession[] = [],
  today = new Date(),
): TrainingPlanWorkoutResponseDto | null {
  if (workouts.length === 0) {
    return null;
  }

  const scheduled = workouts.find((workout) => workout.scheduledDay === DAYS[today.getDay()]);
  if (scheduled) {
    return scheduled;
  }

  const last = completed.at(-1);
  const lastIndex = last
    ? workouts.findIndex((workout) => workout.id === last.sourceTrainingPlanWorkoutId)
    : -1;

  return workouts[(lastIndex + 1) % workouts.length] ?? null;
}
