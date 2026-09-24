import { Exercise } from '../exercises/entities/exercise.entity';
import {
  WorkoutTemplateExerciseResponseDto,
  WorkoutTemplateExerciseSummaryDto,
  WorkoutTemplateResponseDto,
  WorkoutTemplateSummaryResponseDto,
} from './dto/workout-template-response.dto';
import { WorkoutTemplateExercise } from './entities/workout-template-exercise.entity';
import { WorkoutTemplate } from './entities/workout-template.entity';

export function toWorkoutTemplateSummary(
  template: WorkoutTemplate,
): WorkoutTemplateSummaryResponseDto {
  return {
    id: template.id,
    name: template.name,
    description: template.description,
    status: template.status,
    createdByUserId: template.createdByUserId,
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
  };
}

export function toWorkoutTemplateResponse(
  template: WorkoutTemplate,
  items: WorkoutTemplateExercise[] = template.items ?? [],
): WorkoutTemplateResponseDto {
  const ordered = [...items].sort(
    (left, right) => left.position - right.position,
  );

  return {
    ...toWorkoutTemplateSummary(template),
    items: ordered.map((item) => toWorkoutTemplateExerciseResponse(item)),
  };
}

function toWorkoutTemplateExerciseResponse(
  item: WorkoutTemplateExercise,
): WorkoutTemplateExerciseResponseDto {
  return {
    id: item.id,
    position: item.position,
    exercise: toExerciseSummary(item.exercise),
    sets: item.sets,
    prescriptionType: item.prescriptionType,
    repsMin: item.repsMin,
    repsMax: item.repsMax,
    durationSeconds: item.durationSeconds,
    restSeconds: item.restSeconds,
    targetRpe: item.targetRpe === null ? null : Number(item.targetRpe),
    targetRir: item.targetRir,
    tempo: item.tempo,
    notes: item.notes,
  };
}

function toExerciseSummary(
  exercise: Exercise,
): WorkoutTemplateExerciseSummaryDto {
  return {
    id: exercise.id,
    name: exercise.name,
    primaryMuscleGroup: exercise.primaryMuscleGroup,
    equipmentType: exercise.equipmentType,
    difficultyLevel: exercise.difficultyLevel,
    status: exercise.status,
  };
}
