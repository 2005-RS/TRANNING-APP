import type { ClientDashboardResponseDto } from '@/generated/models';
import { ClientDashboardCheckInDtoStatus } from '@/generated/models';
import { CLIENT_DASHBOARD_PERIOD_DAYS } from '@/features/client-dashboard/lib/query-policy';

const emptyPerformance = {
  completedSessions: 0,
  performedSets: 0,
  totalReps: 0,
  externalLoadVolumeKg: 0,
  totalDurationSeconds: 0,
  exercisesPerformed: 0,
};

export const emptyClientDashboard: ClientDashboardResponseDto = {
  periodDays: CLIENT_DASHBOARD_PERIOD_DAYS,
  trainingPlan: null,
  nutritionPlan: null,
  currentWorkoutSession: null,
  recentTraining: { completedSessions: [] },
  performance: emptyPerformance,
  bodyProgress: null,
  checkIn: null,
  notifications: { unreadCount: 0 },
};

export const populatedClientDashboard: ClientDashboardResponseDto = {
  periodDays: CLIENT_DASHBOARD_PERIOD_DAYS,
  trainingPlan: {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    name: 'Hypertrophy block 4',
    startDate: '2026-09-01',
    endDate: '2026-10-12',
    workoutCount: 4,
  },
  nutritionPlan: {
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    name: 'Performance meals',
    startDate: '2026-09-01',
    endDate: null,
    targetCaloriesKcal: 2400,
    targetProteinG: 160,
    targetCarbohydratesG: 250,
    targetFatG: 70,
    mealPlanTotals: {
      caloriesKcal: 2380,
      proteinG: 158,
      carbohydratesG: 246,
      fatG: 68,
      fiberG: 32,
    },
    mealCount: 4,
  },
  currentWorkoutSession: {
    sessionId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    workoutName: 'Lower A',
    startedAt: '2026-09-04T14:05:00.000Z',
    exerciseCount: 6,
    recordedSetCount: 8,
  },
  recentTraining: {
    completedSessions: [
      {
        id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
        workoutName: 'Upper A',
        startedAt: '2026-09-02T16:00:00.000Z',
        completedAt: '2026-09-02T17:10:00.000Z',
        performedSetCount: 18,
      },
      {
        id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
        workoutName: 'Lower B',
        startedAt: '2026-09-03T15:30:00.000Z',
        completedAt: '2026-09-03T16:40:00.000Z',
        performedSetCount: 16,
      },
    ],
  },
  performance: {
    completedSessions: 2,
    performedSets: 34,
    totalReps: 312,
    externalLoadVolumeKg: 18450,
    totalDurationSeconds: 7800,
    exercisesPerformed: 11,
  },
  bodyProgress: {
    id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
    measuredAt: '2026-09-01T08:00:00.000Z',
    bodyWeightKg: 82.4,
    bodyFatPercentage: null,
    waistCm: 81,
    previousBodyWeightKg: 82.8,
    bodyWeightChangeKg: -0.4,
    previousWaistCm: 81.5,
    waistChangeCm: -0.5,
    progressPhotoCount: 3,
    latestProgressPhotoCapturedAt: '2026-09-01T08:05:00.000Z',
  },
  checkIn: {
    id: '99999999-9999-4999-8999-999999999999',
    periodStart: '2026-09-01',
    periodEnd: '2026-09-07',
    status: ClientDashboardCheckInDtoStatus.SUBMITTED,
    submittedAt: '2026-09-03T20:00:00.000Z',
    hasReview: false,
    reviewedAt: null,
  },
  notifications: { unreadCount: 2 },
};

export const planOnlyClientDashboard: ClientDashboardResponseDto = {
  ...emptyClientDashboard,
  trainingPlan: {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    name: 'Hypertrophy block 4',
    startDate: null,
    endDate: null,
    workoutCount: 4,
  },
};

export const partialOptionalClientDashboard: ClientDashboardResponseDto = {
  periodDays: CLIENT_DASHBOARD_PERIOD_DAYS,
  trainingPlan: {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    name: 'Foundation plan',
    workoutCount: 3,
  },
  currentWorkoutSession: null,
  recentTraining: {
    completedSessions: [
      {
        id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
        workoutName: 'Full body',
        startedAt: 'not-a-date',
        completedAt: 'also-not-a-date',
        performedSetCount: 10,
      },
    ],
  },
  performance: {
    completedSessions: 1,
    performedSets: 10,
    totalReps: 80,
    externalLoadVolumeKg: 0,
    totalDurationSeconds: 0,
    exercisesPerformed: 5,
  },
  bodyProgress: {
    id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
    measuredAt: '2026-09-01T08:00:00.000Z',
    bodyWeightKg: null,
    waistCm: null,
    previousBodyWeightKg: null,
    bodyWeightChangeKg: null,
    previousWaistCm: null,
    waistChangeCm: null,
    progressPhotoCount: 0,
    latestProgressPhotoCapturedAt: null,
  },
  checkIn: {
    id: '99999999-9999-4999-8999-999999999999',
    periodStart: '2026-09-01',
    periodEnd: '2026-09-07',
    status: ClientDashboardCheckInDtoStatus.DRAFT,
    submittedAt: null,
    hasReview: false,
    reviewedAt: null,
  },
  nutritionPlan: null,
  notifications: { unreadCount: 0 },
};
