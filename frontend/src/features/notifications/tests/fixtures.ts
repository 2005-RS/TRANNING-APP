import {
  NotificationRelatedEntityDtoType,
  NotificationResponseDtoType,
  type NotificationResponseDto,
} from '@/generated/models';
import { REVIEWED_CHECK_IN_ID } from '@/features/client-check-ins/tests/fixtures';

export const CLIENT_PROFILE_ID = 'p1111111-pppp-4111-8111-p11111111111';
export const TRAINING_PLAN_ID = 't1111111-tttt-4111-8111-t11111111111';
export const NUTRITION_PLAN_ID = 'n1111111-nnnn-4111-8111-n11111111111';
export const SUBMITTED_CHECK_IN_NOTIFICATION_CHECK_IN_ID = 'c7777777-cccc-4111-8111-c77777777777';

export const reviewedNotification: NotificationResponseDto = {
  id: 'a1111111-aaaa-4111-8111-a11111111111',
  type: NotificationResponseDtoType.CHECK_IN_REVIEWED,
  clientProfileId: CLIENT_PROFILE_ID,
  relatedEntity: { type: NotificationRelatedEntityDtoType.CHECK_IN, id: REVIEWED_CHECK_IN_ID },
  readAt: null,
  createdAt: '2026-09-20T09:30:00.000Z',
};

export const trainingPlanNotification: NotificationResponseDto = {
  id: 'a2222222-aaaa-4111-8111-a22222222222',
  type: NotificationResponseDtoType.TRAINING_PLAN_ACTIVATED,
  clientProfileId: CLIENT_PROFILE_ID,
  relatedEntity: { type: NotificationRelatedEntityDtoType.TRAINING_PLAN, id: TRAINING_PLAN_ID },
  readAt: '2026-09-19T10:00:00.000Z',
  createdAt: '2026-09-19T08:00:00.000Z',
};

export const nutritionPlanNotification: NotificationResponseDto = {
  id: 'a3333333-aaaa-4111-8111-a33333333333',
  type: NotificationResponseDtoType.NUTRITION_PLAN_ACTIVATED,
  clientProfileId: CLIENT_PROFILE_ID,
  relatedEntity: { type: NotificationRelatedEntityDtoType.NUTRITION_PLAN, id: NUTRITION_PLAN_ID },
  readAt: null,
  createdAt: '2026-09-18T08:00:00.000Z',
};

export const submittedNotification: NotificationResponseDto = {
  id: 'a4444444-aaaa-4111-8111-a44444444444',
  type: NotificationResponseDtoType.CHECK_IN_SUBMITTED,
  clientProfileId: CLIENT_PROFILE_ID,
  relatedEntity: {
    type: NotificationRelatedEntityDtoType.CHECK_IN,
    id: SUBMITTED_CHECK_IN_NOTIFICATION_CHECK_IN_ID,
  },
  readAt: null,
  createdAt: '2026-09-21T15:00:00.000Z',
};

export const clientNotifications: NotificationResponseDto[] = [
  reviewedNotification,
  trainingPlanNotification,
  nutritionPlanNotification,
];
