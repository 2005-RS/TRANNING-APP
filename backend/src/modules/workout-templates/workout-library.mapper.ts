import { WorkoutLibraryItemResponseDto } from './dto/workout-library-response.dto';
import { WorkoutTemplate } from './entities/workout-template.entity';

export function toWorkoutLibraryItem(
  template: WorkoutTemplate,
): WorkoutLibraryItemResponseDto {
  const items = [...(template.items ?? [])].sort(
    (left, right) => left.position - right.position,
  );
  const totalSeconds = items.reduce(
    (total, item) =>
      total + item.sets * ((item.durationSeconds ?? 45) + item.restSeconds),
    0,
  );

  return {
    id: template.id,
    name: template.name,
    description: template.description,
    exerciseCount: items.length,
    estimatedMinutes: Math.ceil(totalSeconds / 60),
    exercises: items.map((item) => ({
      exerciseId: item.exerciseId,
      name: item.exercise.name,
      sets: item.sets,
      prescriptionType: item.prescriptionType,
      repsMin: item.repsMin,
      repsMax: item.repsMax,
      durationSeconds: item.durationSeconds,
      restSeconds: item.restSeconds,
    })),
  };
}
