import { describe, expect, it } from 'vitest';
import type { NotificationResponseDto } from '@/generated/models';
import {
  notificationTarget,
  notificationText,
} from '@/features/notifications/lib/notification-content';
import { badgeText } from '@/features/notifications/lib/query-policy';
import { validateNotificationsSearch } from '@/features/notifications/lib/search';
import { notificationsCopy } from '@/features/notifications/copy';
import {
  CLIENT_PROFILE_ID,
  NUTRITION_PLAN_ID,
  TRAINING_PLAN_ID,
  nutritionPlanNotification,
  reviewedNotification,
  submittedNotification,
  trainingPlanNotification,
} from '@/features/notifications/tests/fixtures';

describe('notificationTarget', () => {
  it('maps Client notifications to Client routes only', () => {
    expect(notificationTarget(reviewedNotification, 'CLIENT')).toEqual({
      kind: 'client-check-in',
      checkInId: reviewedNotification.relatedEntity.id,
    });
    expect(notificationTarget(trainingPlanNotification, 'CLIENT')).toEqual({ kind: 'client-training' });
    expect(notificationTarget(nutritionPlanNotification, 'CLIENT')).toEqual({ kind: 'client-nutrition' });
    expect(notificationTarget(submittedNotification, 'CLIENT')).toBeNull();
  });

  it('maps Trainer notifications through clientProfileId', () => {
    expect(notificationTarget(submittedNotification, 'TRAINER')).toEqual({
      kind: 'trainer-check-in',
      clientId: CLIENT_PROFILE_ID,
      checkInId: submittedNotification.relatedEntity.id,
    });
    expect(notificationTarget(trainingPlanNotification, 'TRAINER')).toEqual({
      kind: 'trainer-training-plan',
      clientId: CLIENT_PROFILE_ID,
      planId: TRAINING_PLAN_ID,
    });
    expect(notificationTarget(nutritionPlanNotification, 'TRAINER')).toEqual({
      kind: 'trainer-nutrition-plan',
      clientId: CLIENT_PROFILE_ID,
      planId: NUTRITION_PLAN_ID,
    });
    expect(notificationTarget({ ...submittedNotification, clientProfileId: undefined }, 'TRAINER')).toBeNull();
  });

  it('never deep-links Admin notifications', () => {
    for (const item of [reviewedNotification, trainingPlanNotification, submittedNotification]) {
      expect(notificationTarget(item, 'ADMIN')).toBeNull();
    }
  });
});

describe('notificationText', () => {
  it('uses audience-specific copy and a safe fallback for unknown types', () => {
    expect(notificationText(submittedNotification, 'TRAINER').body).toBe(
      notificationsCopy.types.CHECK_IN_SUBMITTED.bodyTrainer,
    );
    expect(notificationText(reviewedNotification, 'CLIENT').body).toBe(
      notificationsCopy.types.CHECK_IN_REVIEWED.body,
    );
    const future = { type: 'SOMETHING_NEW' } as unknown as NotificationResponseDto;
    expect(notificationText(future, 'CLIENT').title).toBe(notificationsCopy.types.unknown.title);
  });
});

describe('validateNotificationsSearch', () => {
  it('keeps only supported values', () => {
    expect(validateNotificationsSearch({})).toEqual({});
    expect(validateNotificationsSearch({ view: 'unread', page: '3' })).toEqual({ view: 'unread', page: 3 });
    expect(validateNotificationsSearch({ view: 'read', page: '0' })).toEqual({});
    expect(validateNotificationsSearch({ page: 'abc' })).toEqual({});
    expect(validateNotificationsSearch({ page: 1 })).toEqual({});
  });
});

describe('badgeText', () => {
  it('caps the visible count', () => {
    expect(badgeText(7)).toBe('7');
    expect(badgeText(99)).toBe('99');
    expect(badgeText(100)).toBe('99+');
  });
});
