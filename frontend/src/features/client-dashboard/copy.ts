import { createLiveCopy, registerEnglishNamespace } from '@/i18n/live-copy';
import { useLiveCopy } from '@/i18n/use-live-copy';

export const clientDashboardCopySource = {
  loadingLabel: 'Loading dashboard',
  greeting: {
    morning: 'Good morning',
    afternoon: 'Good afternoon',
    evening: 'Good evening',
    fallbackName: 'there',
    morningLine: 'Ready for today?',
    afternoonLine: 'Here is where things stand.',
    eveningLine: 'Here is where things stand.',
  },
  primary: {
    inProgressEyebrow: 'In progress',
    planEyebrow: 'Current plan',
    emptyEyebrow: 'Training',
    emptyTitle: 'No training plan is assigned yet.',
    emptyBody: 'Your coach will assign a plan. This is where today’s session will appear.',
    continueTraining: 'Continue training',
    viewTraining: 'View training',
    exercises: 'exercises',
    exercise: 'exercise',
    setsRecorded: 'sets recorded',
    setRecorded: 'set recorded',
    workouts: 'workouts',
    workout: 'workout',
    started: 'Started',
  },
  weekly: {
    title: 'This week',
    description: 'Sessions from the last 7 days.',
    empty: 'No sessions completed this week yet.',
    daysTrained: 'Days trained',
    dayTrained: 'session completed',
    dayRest: 'no session',
    today: 'today',
    sessions: 'sessions',
    session: 'session',
    sets: 'sets',
    set: 'set',
  },
  progress: {
    title: 'Training snapshot',
    description: 'Work from the last 7 days.',
    sessions: 'Sessions',
    sets: 'Sets',
    volume: 'Volume',
    duration: 'Duration',
    reps: 'Reps',
    exercises: 'Exercises',
    bodyTitle: 'Latest measurement',
    weight: 'Weight',
    waist: 'Waist',
    photos: 'Progress photos',
    photosEmpty: 'No progress photos yet.',
    noBody: 'No measurements yet.',
    viewProgress: 'View progress',
  },
  nutrition: {
    title: 'Nutrition plan',
    meals: 'meals',
    meal: 'meal',
    targetCalories: 'Target',
    planCalories: 'Plan total',
    viewNutrition: 'View nutrition',
  },
  checkIn: {
    title: 'Check-in',
    emptyTitle: 'No check-in yet',
    emptyBody: 'Nothing to complete here yet.',
    viewCheckIns: 'View check-ins',
    period: 'Period',
    draft: 'Draft in progress',
    submitted: 'Submitted',
    reviewed: 'Reviewed',
    waitingReview: 'Waiting for review',
    submittedAt: 'Submitted',
    reviewedAt: 'Reviewed',
  },
  error: {
    retry: 'Try again',
    retrying: 'Trying again…',
    network:
      'The dashboard could not be loaded. Check your connection and try again.',
  },
} as const;

registerEnglishNamespace('clientDashboard', clientDashboardCopySource);
export const clientDashboardCopy = createLiveCopy<typeof clientDashboardCopySource>('clientDashboard');

export function useClientDashboardCopy() {
  return useLiveCopy<typeof clientDashboardCopySource>('clientDashboard');
}
