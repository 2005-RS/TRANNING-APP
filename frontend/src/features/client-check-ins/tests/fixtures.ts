import {
  CheckInResponseDtoStatus,
  type CheckInResponseDto,
  type CheckInSummaryResponseDto,
  type PaginatedCheckInsResponseDto,
} from '@/generated/models';

export const DRAFT_CHECK_IN_ID = 'c1111111-cccc-4111-8111-c11111111111';
export const SUBMITTED_CHECK_IN_ID = 'c2222222-cccc-4111-8111-c22222222222';
export const REVIEWED_CHECK_IN_ID = 'c3333333-cccc-4111-8111-c33333333333';
export const PARTIAL_CHECK_IN_ID = 'c4444444-cccc-4111-8111-c44444444444';
export const ZERO_CHECK_IN_ID = 'c5555555-cccc-4111-8111-c55555555555';
export const CREATED_CHECK_IN_ID = 'c9999999-cccc-4111-8111-c99999999999';

const NOW = '2026-09-05T12:00:00.000Z';

function summaryFrom(detail: CheckInResponseDto): CheckInSummaryResponseDto {
  return {
    id: detail.id,
    periodStart: detail.periodStart,
    periodEnd: detail.periodEnd,
    status: detail.status,
    submittedAt: detail.submittedAt,
    hasReview: detail.status === CheckInResponseDtoStatus.REVIEWED,
    createdAt: detail.createdAt,
  };
}

export function paginateCheckIns(
  items: CheckInResponseDto[],
  page = 1,
  limit = 20,
): PaginatedCheckInsResponseDto {
  return {
    data: items.map(summaryFrom),
    meta: {
      page,
      limit,
      totalItems: items.length,
      totalPages: items.length > 0 ? Math.ceil(items.length / limit) : 0,
    },
  };
}

export const emptyCheckInList: PaginatedCheckInsResponseDto = paginateCheckIns([]);

export const draftCheckIn: CheckInResponseDto = {
  id: DRAFT_CHECK_IN_ID,
  periodStart: '2026-08-25',
  periodEnd: '2026-08-31',
  status: CheckInResponseDtoStatus.DRAFT,
  responses: {
    sleepQuality: 4,
    energyLevel: 3,
    stressLevel: null,
    hungerLevel: null,
    recoveryLevel: 2,
    trainingAdherencePct: 80,
    nutritionAdherencePct: null,
    wins: 'Hit every session.',
    challenges: null,
    generalNotes: null,
  },
  submittedAt: null,
  review: null,
  createdAt: NOW,
  updatedAt: NOW,
};

export const submittedCheckIn: CheckInResponseDto = {
  id: SUBMITTED_CHECK_IN_ID,
  periodStart: '2026-08-18',
  periodEnd: '2026-08-24',
  status: CheckInResponseDtoStatus.SUBMITTED,
  responses: {
    sleepQuality: 3,
    energyLevel: 3,
    stressLevel: 2,
    hungerLevel: 3,
    recoveryLevel: 3,
    trainingAdherencePct: 90,
    nutritionAdherencePct: 85,
    wins: 'Steady week.',
    challenges: 'Travel on Thursday.',
    generalNotes: null,
  },
  submittedAt: '2026-08-25T08:00:00.000Z',
  review: null,
  createdAt: '2026-08-18T12:00:00.000Z',
  updatedAt: '2026-08-25T08:00:00.000Z',
};

export const reviewedCheckIn: CheckInResponseDto = {
  id: REVIEWED_CHECK_IN_ID,
  periodStart: '2026-08-11',
  periodEnd: '2026-08-17',
  status: CheckInResponseDtoStatus.REVIEWED,
  responses: {
    sleepQuality: 5,
    energyLevel: 4,
    stressLevel: 1,
    hungerLevel: 2,
    recoveryLevel: 4,
    trainingAdherencePct: 100,
    nutritionAdherencePct: 95,
    wins: 'Strong lifts.',
    challenges: null,
    generalNotes: 'Felt recovered.',
  },
  submittedAt: '2026-08-18T09:00:00.000Z',
  review: {
    id: 'r3333333-cccc-4111-8111-r33333333333',
    feedback: 'Keep the current volume. Sleep looks solid.',
    actionItems: 'Hold calories this week.',
    reviewedByUserId: 't1111111-tttt-4111-8111-t11111111111',
    createdAt: '2026-08-18T15:00:00.000Z',
    updatedAt: '2026-08-18T15:00:00.000Z',
  },
  createdAt: '2026-08-11T12:00:00.000Z',
  updatedAt: '2026-08-18T15:00:00.000Z',
};

export const partialCheckIn: CheckInResponseDto = {
  id: PARTIAL_CHECK_IN_ID,
  periodStart: '2026-08-04',
  periodEnd: '2026-08-10',
  status: CheckInResponseDtoStatus.DRAFT,
  responses: {
    sleepQuality: null,
    energyLevel: null,
    stressLevel: null,
    hungerLevel: null,
    recoveryLevel: null,
    trainingAdherencePct: null,
    nutritionAdherencePct: null,
    wins: null,
    challenges: null,
    generalNotes: null,
  },
  submittedAt: null,
  review: null,
  createdAt: '2026-08-10T12:00:00.000Z',
  updatedAt: '2026-08-10T12:00:00.000Z',
};

export const zeroAdherenceCheckIn: CheckInResponseDto = {
  id: ZERO_CHECK_IN_ID,
  periodStart: '2026-07-28',
  periodEnd: '2026-08-03',
  status: CheckInResponseDtoStatus.DRAFT,
  responses: {
    sleepQuality: null,
    energyLevel: null,
    stressLevel: null,
    hungerLevel: null,
    recoveryLevel: null,
    trainingAdherencePct: 0,
    nutritionAdherencePct: 62.5,
    wins: null,
    challenges: null,
    generalNotes: null,
  },
  submittedAt: null,
  review: null,
  createdAt: '2026-08-03T12:00:00.000Z',
  updatedAt: '2026-08-03T12:00:00.000Z',
};

export const populatedCheckIns: CheckInResponseDto[] = [
  draftCheckIn,
  submittedCheckIn,
  reviewedCheckIn,
];
