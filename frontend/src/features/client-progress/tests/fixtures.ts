import type {
  BodyMeasurementResponseDto,
  ExerciseProgressDetailResponseDto,
  PaginatedBodyMeasurementsResponseDto,
  PaginatedExerciseProgressResponseDto,
  ProgressSummaryResponseDto,
} from '@/generated/models';
import {
  ExerciseProgressDetailResponseDtoAvailablePrescriptionTypesItem,
  ExerciseProgressDetailResponseDtoExerciseStatus,
  ExerciseProgressListItemDtoExerciseStatus,
  ExerciseProgressListItemDtoPrescriptionType,
} from '@/generated/models';

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
  completedSessions: 8,
  performedSets: 64,
  exercisesPerformed: 6,
  totalReps: 512,
  externalLoadVolumeKg: 18450.4,
  totalDurationSeconds: 900,
  firstCompletedSessionAt: '2026-08-08T10:00:00.000Z',
  lastCompletedSessionAt: '2026-09-03T18:30:00.000Z',
};

export const previousProgressSummary: ProgressSummaryResponseDto = {
  completedSessions: 6,
  performedSets: 48,
  exercisesPerformed: 5,
  totalReps: 400,
  externalLoadVolumeKg: 15000,
  totalDurationSeconds: 600,
  firstCompletedSessionAt: '2026-07-10T10:00:00.000Z',
  lastCompletedSessionAt: '2026-08-06T18:00:00.000Z',
};

export const zeroProgressSummary: ProgressSummaryResponseDto = {
  completedSessions: 0,
  performedSets: 0,
  exercisesPerformed: 0,
  totalReps: 0,
  externalLoadVolumeKg: 0,
  totalDurationSeconds: 0,
  firstCompletedSessionAt: null,
  lastCompletedSessionAt: null,
};

export const emptyExerciseList: PaginatedExerciseProgressResponseDto = {
  data: [],
  meta: { page: 1, limit: 20, totalItems: 0, totalPages: 0 },
};

export const populatedExerciseList: PaginatedExerciseProgressResponseDto = {
  data: [
    {
      exerciseId: '77777777-dddd-4ddd-8ddd-777777777777',
      exerciseName: 'Back squat',
      exerciseStatus: ExerciseProgressListItemDtoExerciseStatus.ACTIVE,
      prescriptionType: ExerciseProgressListItemDtoPrescriptionType.REPS,
      completedSessions: 4,
      performedSets: 16,
      totalReps: 128,
      externalLoadVolumeKg: 10240,
      bestLoadKg: 100,
      bestReps: 10,
      bestEstimated1RmKg: 133.3,
      totalDurationSeconds: null,
      bestDurationSeconds: null,
      firstPerformedAt: '2026-08-10T10:00:00.000Z',
      lastPerformedAt: '2026-09-03T18:30:00.000Z',
    },
    {
      exerciseId: '88888888-dddd-4ddd-8ddd-888888888888',
      exerciseName: 'Plank',
      exerciseStatus: ExerciseProgressListItemDtoExerciseStatus.ACTIVE,
      prescriptionType: ExerciseProgressListItemDtoPrescriptionType.DURATION,
      completedSessions: 3,
      performedSets: 9,
      totalReps: null,
      externalLoadVolumeKg: null,
      bestLoadKg: null,
      bestReps: null,
      bestEstimated1RmKg: null,
      totalDurationSeconds: 540,
      bestDurationSeconds: 90,
      firstPerformedAt: '2026-08-12T10:00:00.000Z',
      lastPerformedAt: '2026-09-01T18:00:00.000Z',
    },
  ],
  meta: { page: 1, limit: 20, totalItems: 2, totalPages: 1 },
};

export const emptyBodyList: PaginatedBodyMeasurementsResponseDto = {
  data: [],
  meta: { page: 1, limit: 60, totalItems: 0, totalPages: 0 },
};

export const populatedBodyMeasurements: BodyMeasurementResponseDto[] = [
  {
    id: 'b1111111-bbbb-4111-8111-b11111111111',
    measuredAt: '2026-09-03T08:00:00.000Z',
    bodyWeightKg: 81,
    bodyFatPercentage: null,
    waistCm: 81.2,
    createdAt: '2026-09-03T08:00:00.000Z',
    updatedAt: '2026-09-03T08:00:00.000Z',
  },
  {
    id: 'b2222222-bbbb-4111-8111-b22222222222',
    measuredAt: '2026-08-12T08:00:00.000Z',
    bodyWeightKg: 82.4,
    bodyFatPercentage: null,
    waistCm: 82,
    createdAt: '2026-08-12T08:00:00.000Z',
    updatedAt: '2026-08-12T08:00:00.000Z',
  },
];

export const populatedBodyList: PaginatedBodyMeasurementsResponseDto = {
  data: populatedBodyMeasurements,
  meta: { page: 1, limit: 60, totalItems: 2, totalPages: 1 },
};

const latestBodyMeasurement = populatedBodyMeasurements[0];

export const singleBodyList: PaginatedBodyMeasurementsResponseDto = {
  data: latestBodyMeasurement ? [latestBodyMeasurement] : [],
  meta: { page: 1, limit: 60, totalItems: latestBodyMeasurement ? 1 : 0, totalPages: 1 },
};

export const populatedExerciseDetail: ExerciseProgressDetailResponseDto = {
  exerciseId: '77777777-dddd-4ddd-8ddd-777777777777',
  exerciseName: 'Back squat',
  exerciseStatus: ExerciseProgressDetailResponseDtoExerciseStatus.ACTIVE,
  availablePrescriptionTypes: [
    ExerciseProgressDetailResponseDtoAvailablePrescriptionTypesItem.REPS,
  ],
  reps: {
    prescriptionType: 'REPS',
    completedSessions: 4,
    performedSets: 16,
    totalReps: 128,
    externalLoadVolumeKg: 10240,
    bestLoadKg: 100,
    bestReps: 10,
    bestEstimated1RmKg: 133.3,
    firstPerformedAt: '2026-08-10T10:00:00.000Z',
    lastPerformedAt: '2026-09-03T18:30:00.000Z',
    bestLoad: {
      value: 100,
      workoutSessionId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      performedAt: '2026-09-03T18:30:00.000Z',
      setNumber: 2,
    },
    bestRepsRecord: {
      value: 10,
      workoutSessionId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      performedAt: '2026-08-20T18:00:00.000Z',
      setNumber: 1,
    },
    bestEstimated1Rm: {
      value: 133.3,
      workoutSessionId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      performedAt: '2026-09-03T18:30:00.000Z',
      setNumber: 2,
      actualLoadKg: 100,
      actualReps: 10,
    },
    history: {
      data: [
        {
          workoutSessionId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
          workoutName: 'Lower A',
          performedAt: '2026-09-03T18:30:00.000Z',
          exerciseNameSnapshot: 'Back squat',
          sessionExternalLoadVolumeKg: 3200,
          bestEstimated1RmKg: 133.3,
          occurrences: [
            {
              workoutSessionExerciseId: 'e1111111-e111-4111-8111-e11111111111',
              position: 1,
              exerciseNameSnapshot: 'Back squat',
              sets: [
                {
                  id: 's1111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
                  setNumber: 1,
                  actualReps: 8,
                  actualLoadKg: 90,
                  actualDurationSeconds: null,
                  actualRpe: null,
                  actualRir: null,
                },
                {
                  id: 's2222222-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
                  setNumber: 2,
                  actualReps: 10,
                  actualLoadKg: 100,
                  actualDurationSeconds: null,
                  actualRpe: null,
                  actualRir: null,
                },
              ],
            },
          ],
        },
      ],
      meta: { page: 1, limit: 20, totalItems: 1, totalPages: 1 },
    },
    trend: [
      {
        performedAt: '2026-08-10T10:00:00.000Z',
        workoutSessionId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        bestLoadKg: 90,
        bestEstimated1RmKg: 120,
        externalLoadVolumeKg: 2160,
        totalReps: 24,
      },
      {
        performedAt: '2026-09-03T18:30:00.000Z',
        workoutSessionId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        bestLoadKg: 100,
        bestEstimated1RmKg: 133.3,
        externalLoadVolumeKg: 3200,
        totalReps: 18,
      },
    ],
  },
  duration: null,
};

export const SQUAT_EXERCISE_ID = '77777777-dddd-4ddd-8ddd-777777777777';
export const PLANK_EXERCISE_ID = '88888888-dddd-4ddd-8ddd-888888888888';
export const MISSING_EXERCISE_ID = '99999999-dddd-4ddd-8ddd-999999999999';
