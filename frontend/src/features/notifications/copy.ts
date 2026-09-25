import { createLiveCopy, registerEnglishNamespace } from '@/i18n/live-copy';
import { useLiveCopy } from '@/i18n/use-live-copy';

/**
 * The inbox only receives semantic event types. Copy never names an actor or
 * repeats Check-In text: the contract does not expose either.
 */
export const notificationsCopySource = {
  title: 'Notifications',
  description: {
    client: 'Updates about your check-ins and plans.',
    trainer: 'Updates about your assigned Clients.',
    admin: 'Updates addressed to your account.',
  },
  loadingLabel: 'Loading notifications',
  filters: {
    label: 'Show',
    all: 'All',
    unread: 'Unread',
  },
  markAllRead: 'Mark all as read',
  markingAllRead: 'Marking…',
  markAllReadDone: 'All notifications marked as read.',
  markRead: 'Mark as read',
  markingRead: 'Marking…',
  unread: 'Unread',
  unreadCount: '{{count}} unread',
  open: 'Open',
  empty: {
    allTitle: 'No notifications yet',
    allBody: 'Updates about check-ins and plans will appear here.',
    unreadTitle: 'You are all caught up',
    unreadBody: 'There are no unread notifications.',
    showAll: 'Show all notifications',
  },
  pagination: {
    label: 'Notification pages',
    page: 'Page {{page}} of {{total}}',
    previous: 'Previous',
    next: 'Next',
  },
  types: {
    CHECK_IN_SUBMITTED: {
      title: 'Check-in submitted',
      body: 'A check-in was submitted.',
      bodyTrainer: 'A Client submitted a check-in for review.',
    },
    CHECK_IN_REVIEWED: {
      title: 'Check-in reviewed',
      body: 'Your check-in was reviewed. Open it to see the feedback.',
      bodyTrainer: 'A check-in was reviewed.',
    },
    TRAINING_PLAN_ACTIVATED: {
      title: 'Training plan active',
      body: 'A training plan is now active for you.',
      bodyTrainer: 'A training plan was activated for a Client.',
    },
    NUTRITION_PLAN_ACTIVATED: {
      title: 'Nutrition plan active',
      body: 'A nutrition plan is now active for you.',
      bodyTrainer: 'A nutrition plan was activated for a Client.',
    },
    unknown: {
      title: 'Notification',
      body: 'There is an update for your account.',
      bodyTrainer: 'There is an update for your account.',
    },
  },
  error: {
    retry: 'Try again',
    retrying: 'Trying again…',
    network: 'Notifications could not be loaded. Check your connection and try again.',
    markFailed: 'The notification could not be updated. Try again.',
    notFound: 'This notification is no longer available.',
  },
} as const;

registerEnglishNamespace('notifications', notificationsCopySource);
export const notificationsCopy = createLiveCopy<typeof notificationsCopySource>('notifications');

export function useNotificationsCopy() {
  return useLiveCopy<typeof notificationsCopySource>('notifications');
}
