import { toIsoDateString } from '../clients/iso-date.util';
import { WorkoutPrescriptionType } from '../workout-templates/enums/workout-prescription-type.enum';
import {
  TrainingPlanExerciseResponseDto,
  TrainingPlanResponseDto,
  TrainingPlanSummaryResponseDto,
  TrainingPlanWorkoutResponseDto,
} from './dto/training-plan-response.dto';
import { TrainingPlanExercise } from './entities/training-plan-exercise.entity';
import { TrainingPlan } from './entities/training-plan.entity';
import { TrainingPlanWorkout } from './entities/training-plan-workout.entity';

export function toTrainingPlanSummary(
  plan: TrainingPlan,
): TrainingPlanSummaryResponseDto {
  return {
    id: plan.id,
    name: plan.name,
    description: plan.description,
    status: plan.status,
    startDate: toIsoDateString(plan.startDate),
    endDate: toIsoDateString(plan.endDate),
    clientProfileId: plan.clientProfileId,
    createdByUserId: plan.createdByUserId,
    activatedAt: plan.activatedAt,
    archivedAt: plan.archivedAt,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
  };
}

export function toTrainingPlanResponse(
  plan: TrainingPlan,
  workouts: TrainingPlanWorkout[] = plan.workouts ?? [],
): TrainingPlanResponseDto {
  const ordered = [...workouts].sort(
    (left, right) => left.position - right.position,
  );

  return {
    ...toTrainingPlanSummary(plan),
    workouts: ordered.map((workout) => toWorkoutResponse(workout)),
  };
}

function toWorkoutResponse(
  workout: TrainingPlanWorkout,
): TrainingPlanWorkoutResponseDto {
  const exercises = [...(workout.exercises ?? [])].sort(
    (left, right) => left.position - right.position,
  );

  return {
    id: workout.id,
    sourceWorkoutTemplateId: workout.sourceWorkoutTemplateId,
    name: workout.nameSnapshot,
    description: workout.descriptionSnapshot,
    position: workout.position,
    scheduledDay: workout.scheduledDay,
    notes: workout.notes,
    exercises: exercises.map((exercise) => toExerciseResponse(exercise)),
  };
}

function toExerciseResponse(
  exercise: TrainingPlanExercise,
): TrainingPlanExerciseResponseDto {
  return {
    id: exercise.id,
    exerciseId: exercise.exerciseId,
    exerciseName: exercise.exerciseNameSnapshot,
    position: exercise.position,
    sets: exercise.sets,
    prescriptionType: exercise.prescriptionType as WorkoutPrescriptionType,
    repsMin: exercise.repsMin,
    repsMax: exercise.repsMax,
    durationSeconds: exercise.durationSeconds,
    restSeconds: exercise.restSeconds,
    targetLoadKg:
      exercise.targetLoadKg === null ? null : Number(exercise.targetLoadKg),
    targetRpe: exercise.targetRpe === null ? null : Number(exercise.targetRpe),
    targetRir: exercise.targetRir,
    tempo: exercise.tempo,
    notes: exercise.notes,
  };
}
