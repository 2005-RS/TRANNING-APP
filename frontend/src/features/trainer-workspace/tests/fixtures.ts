import type {
  BodyMeasurementResponseDto,
  CheckInResponseDto,
  CheckInSummaryResponseDto,
  ClientResponseDto,
  ExerciseMediaResponseDto,
  ExerciseResponseDto,
  NutritionFoodResponseDto,
  NutritionPlanResponseDto,
  ProgressSummaryResponseDto,
  ProgressPhotoResponseDto,
  TrainerClientOverviewItemDto,
  TrainerDashboardResponseDto,
  TrainingPlanResponseDto,
  WorkoutSessionSummaryResponseDto,
  WorkoutTemplateExerciseResponseDto,
  WorkoutTemplateExerciseSummaryDto,
  WorkoutTemplateResponseDto,
  WorkoutTemplateSummaryResponseDto,
} from '@/generated/models';
import {
  CheckInResponseDtoStatus,
  CheckInSummaryResponseDtoStatus,
  ClientResponseDtoExperienceLevel,
  ClientResponseDtoPrimaryGoal,
  ClientUserResponseDtoRole,
  ClientUserResponseDtoStatus,
  ExerciseMediaResponseDtoMediaType,
  ExerciseMediaResponseDtoStatus,
  ExerciseResponseDtoDifficultyLevel,
  ExerciseResponseDtoEquipmentType,
  ExerciseResponseDtoPrimaryMuscleGroup,
  ExerciseResponseDtoStatus,
  NutritionFoodResponseDtoStatus,
  NutritionPlanResponseDtoStatus,
  ProgressPhotoResponseDtoPose,
  ProgressPhotoResponseDtoStatus,
  TrainingPlanResponseDtoStatus,
  WorkoutSessionSummaryResponseDtoStatus,
  WorkoutTemplateExerciseResponseDtoPrescriptionType,
  WorkoutTemplateResponseDtoStatus,
  WorkoutTemplateSummaryResponseDtoStatus,
} from '@/generated/models';

export const TRAINER_CLIENT_A_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
export const TRAINER_CLIENT_B_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
export const TRAINER_CHECK_IN_ID = 'c1111111-c111-4111-8111-c11111111111';
export const TRAINER_PLAN_ID = 'p1111111-p111-4111-8111-p11111111111';
export const TRAINER_NUTRITION_PLAN_ID = 'n1111111-n111-4111-8111-n11111111111';
export const TRAINER_TEMPLATE_ID = 't1111111-t111-4111-8111-t11111111111';
export const TRAINER_TEMPLATE_B_ID = 't2222222-t222-4222-8222-t22222222222';
export const TRAINER_EXERCISE_ID = 'e1111111-e111-4111-8111-e11111111111';
export const TRAINER_EXERCISE_B_ID = 'e2222222-e222-4222-8222-e22222222222';
export const TRAINER_ADMIN_EXERCISE_ID = 'e9999999-e999-4999-8999-e99999999999';
export const TRAINER_CREATED_EXERCISE_ID = 'e3333333-e333-4333-8333-e33333333333';
export const TRAINER_MEDIA_ID = 'mda11111-mda1-4111-8111-mda111111111';
export const TRAINER_UPLOADED_MEDIA_ID = 'mda22222-mda2-4222-8222-mda222222222';
export const TRAINER_TEMPLATE_ITEM_A_ID = 'ti111111-ti11-4111-8111-ti1111111111';
export const TRAINER_TEMPLATE_ITEM_B_ID = 'ti222222-ti22-4222-8222-ti2222222222';
export const TRAINER_FOOD_ID = 'f1111111-f111-4111-8111-f11111111111';
export const TRAINER_PHOTO_ID = 'd1111111-d111-4111-8111-d11111111111';
export const TRAINER_MEASUREMENT_ID = 'm1111111-m111-4111-8111-m11111111111';

export const emptyPagination = { page: 1, limit: 20, totalItems: 0, totalPages: 0 };

export const emptyTrainerDashboard: TrainerDashboardResponseDto = {
  activeClientCount: 0,
  disabledAssignedClientCount: 0,
  pendingCheckIns: { count: 0, items: [] },
  clientsWithoutRecentTraining: { inactivityDays: 7, count: 0, items: [] },
  clientsWithoutActiveTrainingPlan: { count: 0, items: [] },
  clientsWithoutActiveNutritionPlan: { count: 0, items: [] },
  recentCompletedSessions: [],
  notifications: { unreadCount: 0 },
};

export const populatedTrainerDashboard: TrainerDashboardResponseDto = {
  activeClientCount: 2,
  disabledAssignedClientCount: 0,
  pendingCheckIns: {
    count: 1,
    items: [
      {
        checkInId: TRAINER_CHECK_IN_ID,
        clientProfileId: TRAINER_CLIENT_A_ID,
        clientName: 'Ada Client',
        periodStart: '2026-08-25',
        periodEnd: '2026-08-31',
        submittedAt: '2026-09-01T12:00:00.000Z',
      },
    ],
  },
  clientsWithoutRecentTraining: {
    inactivityDays: 7,
    count: 1,
    items: [
      {
        clientProfileId: TRAINER_CLIENT_B_ID,
        clientName: 'Bea Client',
        lastCompletedWorkoutAt: null,
      },
    ],
  },
  clientsWithoutActiveTrainingPlan: {
    count: 1,
    items: [{ clientProfileId: TRAINER_CLIENT_B_ID, clientName: 'Bea Client' }],
  },
  clientsWithoutActiveNutritionPlan: { count: 0, items: [] },
  recentCompletedSessions: [
    {
      workoutSessionId: 's1111111-s111-4111-8111-s11111111111',
      clientProfileId: TRAINER_CLIENT_A_ID,
      clientName: 'Ada Client',
      workoutName: 'Lower A',
      completedAt: '2026-09-04T15:00:00.000Z',
      performedSetCount: 12,
    },
  ],
  notifications: { unreadCount: 0 },
};

export function clientProfile(
  id: string,
  firstName: string,
  lastName: string,
): ClientResponseDto {
  return {
    id,
    user: {
      id: `u-${id}`,
      email: `${firstName.toLowerCase()}@example.test`,
      firstName,
      lastName,
      role: ClientUserResponseDtoRole.CLIENT,
      status: ClientUserResponseDtoStatus.ACTIVE,
    },
    phone: null,
    dateOfBirth: null,
    primaryGoal: ClientResponseDtoPrimaryGoal.STRENGTH,
    goalNotes: null,
    experienceLevel: ClientResponseDtoExperienceLevel.INTERMEDIATE,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

export const trainerClientA = clientProfile(TRAINER_CLIENT_A_ID, 'Ada', 'Client');
export const trainerClientB = clientProfile(TRAINER_CLIENT_B_ID, 'Bea', 'Client');

export const trainerOverviewA: TrainerClientOverviewItemDto = {
  clientProfileId: TRAINER_CLIENT_A_ID,
  clientName: 'Ada Client',
  firstName: 'Ada',
  lastName: 'Client',
  hasActiveTrainingPlan: true,
  currentTrainingPlanName: 'Hypertrophy block',
  hasActiveNutritionPlan: true,
  currentNutritionPlanName: 'Performance meals',
  lastCompletedWorkoutAt: '2026-09-04T15:00:00.000Z',
  latestCheckInStatus: 'SUBMITTED',
  latestCheckInPeriodEnd: '2026-08-31',
  hasPendingCheckIn: true,
  latestBodyMeasurementAt: '2026-09-01T00:00:00.000Z',
};

export const trainerOverviewB: TrainerClientOverviewItemDto = {
  clientProfileId: TRAINER_CLIENT_B_ID,
  clientName: 'Bea Client',
  firstName: 'Bea',
  lastName: 'Client',
  hasActiveTrainingPlan: false,
  currentTrainingPlanName: null,
  hasActiveNutritionPlan: false,
  currentNutritionPlanName: null,
  lastCompletedWorkoutAt: null,
  latestCheckInStatus: null,
  latestCheckInPeriodEnd: null,
  hasPendingCheckIn: false,
  latestBodyMeasurementAt: null,
};

export const emptyProgressSummary: ProgressSummaryResponseDto = {
  completedSessions: 0,
  performedSets: 0,
  exercisesPerformed: 0,
  totalReps: 0,
  externalLoadVolumeKg: 0,
  totalDurationSeconds: 0,
  firstCompletedSessionAt: null,
  lastCompletedSessionAt: null,
};

export const populatedProgressSummary: ProgressSummaryResponseDto = {
  completedSessions: 4,
  performedSets: 32,
  exercisesPerformed: 6,
  totalReps: 240,
  externalLoadVolumeKg: 18450,
  totalDurationSeconds: 0,
  firstCompletedSessionAt: '2026-08-10T00:00:00.000Z',
  lastCompletedSessionAt: '2026-09-04T15:00:00.000Z',
};

export const submittedCheckInSummary: CheckInSummaryResponseDto = {
  id: TRAINER_CHECK_IN_ID,
  periodStart: '2026-08-25',
  periodEnd: '2026-08-31',
  status: CheckInSummaryResponseDtoStatus.SUBMITTED,
  submittedAt: '2026-09-01T12:00:00.000Z',
  hasReview: false,
  createdAt: '2026-08-25T00:00:00.000Z',
};

export const submittedCheckInDetail: CheckInResponseDto = {
  id: TRAINER_CHECK_IN_ID,
  periodStart: '2026-08-25',
  periodEnd: '2026-08-31',
  status: CheckInResponseDtoStatus.SUBMITTED,
  responses: {
    sleepQuality: 4,
    energyLevel: 3,
    stressLevel: 2,
    hungerLevel: null,
    recoveryLevel: 4,
    trainingAdherencePct: 90,
    nutritionAdherencePct: 80,
    wins: 'Hit all lower sessions.',
    challenges: null,
    generalNotes: null,
  },
  submittedAt: '2026-09-01T12:00:00.000Z',
  review: null,
  createdAt: '2026-08-25T00:00:00.000Z',
  updatedAt: '2026-09-01T12:00:00.000Z',
};

export const draftTrainingPlan: TrainingPlanResponseDto = {
  id: TRAINER_PLAN_ID,
  name: 'Hypertrophy block',
  description: null,
  status: TrainingPlanResponseDtoStatus.DRAFT,
  startDate: '2026-09-01',
  endDate: '2026-10-12',
  clientProfileId: TRAINER_CLIENT_A_ID,
  createdByUserId: '33333333-3333-4333-8333-333333333333',
  activatedAt: null,
  archivedAt: null,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
  workouts: [],
};

export const draftNutritionPlan: NutritionPlanResponseDto = {
  id: TRAINER_NUTRITION_PLAN_ID,
  name: 'Performance meals',
  description: null,
  status: NutritionPlanResponseDtoStatus.DRAFT,
  startDate: '2026-09-01',
  endDate: null,
  targets: { caloriesKcal: 2400.5, proteinG: 160.25, carbohydratesG: 220, fatG: 70 },
  clientProfileId: TRAINER_CLIENT_A_ID,
  createdByUserId: '33333333-3333-4333-8333-333333333333',
  activatedAt: null,
  archivedAt: null,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
  mealPlanTotals: { caloriesKcal: 0, proteinG: 0, carbohydratesG: 0, fatG: 0, fiberG: 0 },
  targetDifferences: {
    caloriesDifferenceKcal: -2400.5,
    proteinDifferenceG: -160.25,
    carbohydratesDifferenceG: -220,
    fatDifferenceG: -70,
  },
  meals: [],
};

export const catalogExercise: ExerciseResponseDto = {
  id: TRAINER_EXERCISE_ID,
  name: 'Back squat',
  description: null,
  instructions: null,
  primaryMuscleGroup: ExerciseResponseDtoPrimaryMuscleGroup.QUADRICEPS,
  equipmentType: ExerciseResponseDtoEquipmentType.BARBELL,
  difficultyLevel: ExerciseResponseDtoDifficultyLevel.INTERMEDIATE,
  status: ExerciseResponseDtoStatus.ACTIVE,
  createdByUserId: '33333333-3333-4333-8333-333333333333',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

export const catalogExerciseB: ExerciseResponseDto = {
  id: TRAINER_EXERCISE_B_ID,
  name: 'Bench press',
  description: null,
  instructions: null,
  primaryMuscleGroup: ExerciseResponseDtoPrimaryMuscleGroup.CHEST,
  equipmentType: ExerciseResponseDtoEquipmentType.BARBELL,
  difficultyLevel: ExerciseResponseDtoDifficultyLevel.INTERMEDIATE,
  status: ExerciseResponseDtoStatus.ACTIVE,
  createdByUserId: '33333333-3333-4333-8333-333333333333',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

export const adminCatalogExercise: ExerciseResponseDto = {
  id: TRAINER_ADMIN_EXERCISE_ID,
  name: 'Vital bench press',
  description: null,
  instructions: null,
  primaryMuscleGroup: ExerciseResponseDtoPrimaryMuscleGroup.CHEST,
  equipmentType: ExerciseResponseDtoEquipmentType.BARBELL,
  difficultyLevel: ExerciseResponseDtoDifficultyLevel.INTERMEDIATE,
  status: ExerciseResponseDtoStatus.ACTIVE,
  createdByUserId: '44444444-4444-4444-8444-444444444444',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

export const SIGNED_EXERCISE_STORAGE_URL = 'https://storage.test/exercise-media-upload';

export function toTemplateExerciseSummary(exercise: ExerciseResponseDto): WorkoutTemplateExerciseSummaryDto {
  return {
    id: exercise.id,
    name: exercise.name,
    primaryMuscleGroup: exercise.primaryMuscleGroup as WorkoutTemplateExerciseSummaryDto['primaryMuscleGroup'],
    equipmentType: exercise.equipmentType as WorkoutTemplateExerciseSummaryDto['equipmentType'],
    difficultyLevel: exercise.difficultyLevel as WorkoutTemplateExerciseSummaryDto['difficultyLevel'],
    status: exercise.status as WorkoutTemplateExerciseSummaryDto['status'],
  };
}

export const readyExerciseImage: ExerciseMediaResponseDto = {
  id: TRAINER_MEDIA_ID,
  mediaType: ExerciseMediaResponseDtoMediaType.IMAGE,
  originalFileName: 'back-squat.jpg',
  mimeType: 'image/jpeg',
  fileSizeBytes: 48_000,
  status: ExerciseMediaResponseDtoStatus.READY,
  displayOrder: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  finalizedAt: '2026-01-01T00:00:00.000Z',
};

export const SIGNED_EXERCISE_MEDIA_URL = 'https://signed.example.test/exercise-media';

export const catalogFood: NutritionFoodResponseDto = {
  id: TRAINER_FOOD_ID,
  name: 'Chicken breast',
  brand: null,
  description: null,
  nutritionPer100g: {
    caloriesKcal: 165,
    proteinG: 31,
    carbohydratesG: 0,
    fatG: 3.6,
    fiberG: 0,
  },
  status: NutritionFoodResponseDtoStatus.ACTIVE,
  createdByUserId: '33333333-3333-4333-8333-333333333333',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

export const templateSummary: WorkoutTemplateSummaryResponseDto = {
  id: TRAINER_TEMPLATE_ID,
  name: 'Lower A',
  description: null,
  status: WorkoutTemplateSummaryResponseDtoStatus.ACTIVE,
  createdByUserId: '33333333-3333-4333-8333-333333333333',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

export const templateSummaryB: WorkoutTemplateSummaryResponseDto = {
  id: TRAINER_TEMPLATE_B_ID,
  name: 'Push Strength',
  description: 'Upper pressing',
  status: WorkoutTemplateSummaryResponseDtoStatus.DRAFT,
  createdByUserId: '33333333-3333-4333-8333-333333333333',
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-04T00:00:00.000Z',
};

export const templateDetail: WorkoutTemplateResponseDto = {
  ...templateSummary,
  status: WorkoutTemplateResponseDtoStatus.ACTIVE,
  items: [],
};

export const squatTemplateItem: WorkoutTemplateExerciseResponseDto = {
  id: TRAINER_TEMPLATE_ITEM_A_ID,
  position: 1,
  exercise: toTemplateExerciseSummary(catalogExercise),
  sets: 4,
  prescriptionType: WorkoutTemplateExerciseResponseDtoPrescriptionType.REPS,
  repsMin: 8,
  repsMax: 10,
  durationSeconds: null,
  restSeconds: 120,
  targetRpe: null,
  targetRir: null,
  tempo: null,
  notes: 'Brace before every rep.',
};

export const benchTemplateItem: WorkoutTemplateExerciseResponseDto = {
  id: TRAINER_TEMPLATE_ITEM_B_ID,
  position: 2,
  exercise: toTemplateExerciseSummary(catalogExerciseB),
  sets: 3,
  prescriptionType: WorkoutTemplateExerciseResponseDtoPrescriptionType.REPS,
  repsMin: 10,
  repsMax: 12,
  durationSeconds: null,
  restSeconds: 90,
  targetRpe: null,
  targetRir: null,
  tempo: null,
  notes: null,
};

export const draftTemplateDetail: WorkoutTemplateResponseDto = {
  ...templateSummaryB,
  status: WorkoutTemplateResponseDtoStatus.DRAFT,
  items: [],
};

export const populatedDraftTemplate: WorkoutTemplateResponseDto = {
  ...templateSummaryB,
  status: WorkoutTemplateResponseDtoStatus.DRAFT,
  items: [squatTemplateItem, benchTemplateItem],
};

export const measurementA: BodyMeasurementResponseDto = {
  id: TRAINER_MEASUREMENT_ID,
  measuredAt: '2026-09-01T08:00:00.000Z',
  bodyWeightKg: 82.4,
  bodyFatPercentage: 14.2,
  neckCm: null,
  shouldersCm: null,
  chestCm: 108,
  waistCm: 81.5,
  hipsCm: null,
  leftArmCm: null,
  rightArmCm: null,
  leftThighCm: null,
  rightThighCm: null,
  leftCalfCm: null,
  rightCalfCm: null,
  notes: null,
  createdAt: '2026-09-01T08:00:00.000Z',
  updatedAt: '2026-09-01T08:00:00.000Z',
};

export const photoA: ProgressPhotoResponseDto = {
  id: TRAINER_PHOTO_ID,
  pose: ProgressPhotoResponseDtoPose.FRONT,
  status: ProgressPhotoResponseDtoStatus.READY,
  mimeType: 'image/jpeg',
  fileSizeBytes: 120000,
  capturedAt: '2026-09-01T08:00:00.000Z',
  bodyMeasurementId: TRAINER_MEASUREMENT_ID,
  finalizedAt: '2026-09-01T08:01:00.000Z',
  createdAt: '2026-09-01T08:00:00.000Z',
};

export const completedSession: WorkoutSessionSummaryResponseDto = {
  id: 's1111111-s111-4111-8111-s11111111111',
  trainingPlanId: TRAINER_PLAN_ID,
  sourceTrainingPlanWorkoutId: 'w1111111-w111-4111-8111-w11111111111',
  workoutName: 'Lower A',
  workoutDescription: null,
  scheduledDay: null,
  status: WorkoutSessionSummaryResponseDtoStatus.COMPLETED,
  startedAt: '2026-09-04T14:00:00.000Z',
  completedAt: '2026-09-04T15:00:00.000Z',
  cancelledAt: null,
  createdAt: '2026-09-04T14:00:00.000Z',
  updatedAt: '2026-09-04T15:00:00.000Z',
};
