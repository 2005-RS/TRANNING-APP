import { authCopy } from '@/features/auth/copy';
import { createLiveCopy, registerEnglishNamespace } from '@/i18n/live-copy';
import { useLiveCopy } from '@/i18n/use-live-copy';

export function documentTitleFor(pageTitle: string): string {
  return `${pageTitle} · ${authCopy.productName}`;
}

export const navigationCopySource = {
  skipToMain: 'Skip to main content',
  openNavigation: 'Open navigation',
  closeNavigation: 'Close navigation',
  primaryNav: 'Primary',
  moreNav: 'More',
  userMenu: 'Account menu',
  role: 'Role',
  theme: 'Theme',
  themeDark: 'Dark',
  themeLight: 'Light',
  themeSystem: 'System',
  comingSoon: 'Coming soon',
  placeholderBody: 'Nothing is here yet.',
  notFoundTitle: 'Page not found',
  notFoundBody: 'That page does not exist or is no longer available.',
  goToHome: 'Go to home',
  goToLogin: 'Go to sign in',
  routeErrorTitle: 'Something went wrong',
  routeErrorBody: 'The page could not be displayed. Try again.',
  retry: 'Try again',
  reload: 'Reload',
  roles: {
    CLIENT: 'Client',
    TRAINER: 'Trainer',
    ADMIN: 'Admin',
  },
} as const;

export const clientCopySource = {
  mainNav: 'Main',
  home: { label: 'Home', title: 'Home', description: 'Your training overview.' },
  training: {
    label: 'Training',
    title: 'Training',
    description: 'Start or continue a workout from your current plan.',
  },
  workout: {
    title: 'Workout',
    description: 'Record this session.',
    close: 'Close workout',
  },
  progress: {
    label: 'Progress',
    title: 'Progress',
    description: 'Completed training, body trends, and exercise history.',
  },
  nutrition: {
    label: 'Nutrition',
    title: 'Nutrition',
    description: 'Your current assigned meal plan and daily targets.',
  },
  more: { label: 'More', title: 'More', description: 'Body, check-ins, and notifications.' },
  body: {
    label: 'Body progress',
    title: 'Body progress',
    description: 'Record measurements and private progress photos.',
  },
  checkIns: {
    label: 'Check-ins',
    title: 'Check-ins',
    description: 'Share how the period went and see Trainer feedback.',
  },
  notifications: {
    label: 'Notifications',
    title: 'Notifications',
    description: 'Notifications will appear here.',
  },
} as const;

export const trainerCopySource = {
  dashboard: {
    label: 'Dashboard',
    title: 'Dashboard',
    description: 'What needs attention across assigned Clients.',
  },
  clients: {
    label: 'Clients',
    title: 'Clients',
    description: 'Assigned Clients and the next coaching action.',
  },
  checkIns: {
    label: 'Check-ins',
    title: 'Check-ins',
    description: 'Submitted check-ins waiting for review.',
  },
  training: {
    label: 'Training',
    title: 'Training',
    description: 'Workout templates used in Client plans.',
  },
  nutrition: {
    label: 'Nutrition',
    title: 'Nutrition',
    description: 'Foods used when building prescribed meal plans.',
  },
  exercises: {
    label: 'Exercises',
    title: 'Exercises',
    description: 'Catalog used in templates and plans.',
  },
  notifications: {
    label: 'Notifications',
    title: 'Notifications',
    description: 'Notifications will appear here.',
  },
} as const;

export const adminCopySource = {
  dashboard: {
    label: 'Dashboard',
    title: 'Dashboard',
    description: 'Operational counts for accounts, assignments, and active plans.',
  },
  trainers: {
    label: 'Trainers',
    title: 'Trainers',
    description: 'Create and manage Trainer accounts.',
  },
  clients: { label: 'Clients', title: 'Clients', description: 'Create and manage Client accounts.' },
  assignments: {
    label: 'Assignments',
    title: 'Assignments',
    description: 'Set, change, and review Trainer assignments.',
  },
  exercises: {
    label: 'Exercises',
    title: 'Exercises',
    description: 'Manage the shared exercise catalog.',
  },
  foods: { label: 'Foods', title: 'Foods', description: 'Manage the nutrition food catalog.' },
  notifications: {
    label: 'Notifications',
    title: 'Notifications',
    description: 'Notifications will appear here.',
  },
} as const;

registerEnglishNamespace('navigation', navigationCopySource);
registerEnglishNamespace('clientNav', clientCopySource);
registerEnglishNamespace('trainerNav', trainerCopySource);
registerEnglishNamespace('adminNav', adminCopySource);

export const navigationCopy = createLiveCopy<typeof navigationCopySource>('navigation');
export const clientCopy = createLiveCopy<typeof clientCopySource>('clientNav');
export const trainerCopy = createLiveCopy<typeof trainerCopySource>('trainerNav');
export const adminCopy = createLiveCopy<typeof adminCopySource>('adminNav');

export function useNavigationCopy() {
  return useLiveCopy<typeof navigationCopySource>('navigation');
}

export function useClientNavCopy() {
  return useLiveCopy<typeof clientCopySource>('clientNav');
}

export function useTrainerNavCopy() {
  return useLiveCopy<typeof trainerCopySource>('trainerNav');
}

export function useAdminNavCopy() {
  return useLiveCopy<typeof adminCopySource>('adminNav');
}
