import { createLiveCopy, registerEnglishNamespace } from '@/i18n/live-copy';
import { useLiveCopy } from '@/i18n/use-live-copy';

export const workoutCopySource = {
  hub: {
    loadingLabel: 'Loading training',
    title: 'Training',
    description:
      'Start a workout from your current plan, or continue a session already in progress.',
    planEyebrow: 'Current plan',
    emptyTitle: 'No training plan is assigned yet.',
    emptyBody:
      'Your coach will assign a plan. Workouts you can start will appear here.',
    inProgressEyebrow: 'In progress',
    continue: 'Continue workout',
    start: 'Start',
    startNamed: (name: string) => `Start ${name}`,
    exercises: 'exercises',
    exercise: 'exercise',
    setRecorded: 'set recorded',
    setsRecorded: 'sets recorded',
    alreadyInProgress:
      'Finish or cancel the current workout before starting another.',
    started: 'Started',
  },
  focus: {
    loadingLabel: 'Loading workout',
    close: 'Close workout',
    eyebrow: 'Workout',
    exerciseOf: (current: number, total: number) => `${current} of ${total}`,
    previousExercise: 'Previous exercise',
    nextExercise: 'Next exercise',
    recorded: 'Recorded',
    noExercises: 'This workout has no exercises.',
    logSet: 'Log set',
    loggingSet: 'Saving set…',
    undoLastSet: 'Remove last set',
    undoTitle: 'Remove the last set?',
    undoBody: 'The last recorded set for this exercise will be removed.',
    undoConfirm: 'Remove last set',
    keepSets: 'Keep sets',
    load: 'Load (kg)',
    reps: 'Reps',
    duration: 'Duration (sec)',
    restRemaining: 'Rest remaining',
    skipRest: 'Skip rest',
    restDone: 'Rest complete',
    continueAfterRest: 'Continue',
    complete: 'Finish workout',
    completing: 'Finishing…',
    completeTitle: 'Finish this workout?',
    completeBody:
      'This will mark the session complete. You will not be able to log more sets.',
    completeConfirm: 'Finish workout',
    completeNeedSets: 'Log at least one set before finishing.',
    cancel: 'Cancel workout',
    cancelling: 'Cancelling…',
    cancelTitle: 'Cancel this workout?',
    cancelBody: 'The session will be cancelled. You will not be able to log more sets.',
    cancelConfirm: 'Cancel workout',
    keepTraining: 'Keep training',
    completedTitle: 'Workout complete',
    cancelledTitle: 'Workout cancelled',
    backToTraining: 'Back to training',
    terminalHint: 'This session is no longer in progress.',
    target: 'Target',
    viewDemonstration: 'View demonstration',
    playDemonstration: 'Play demonstration',
    pauseDemonstration: 'Pause demonstration',
    mediaLoading: 'Loading demonstration',
    mediaEmpty: 'No demonstration available.',
    mediaFailed: 'Demonstration could not be loaded.',
    mediaRetry: 'Retry',
    decrease: (field: string) => `Decrease ${field}`,
    increase: (field: string) => `Increase ${field}`,
  },
  toast: {
    completed: 'Workout complete.',
    cancelled: 'Workout cancelled.',
  },
  error: {
    retry: 'Try again',
    retrying: 'Trying again…',
    network:
      'Training could not be loaded. Check your connection and try again.',
  },
} as const;

registerEnglishNamespace('workout', workoutCopySource);
export const workoutCopy = createLiveCopy<typeof workoutCopySource>('workout');

export function useWorkoutCopy() {
  return useLiveCopy<typeof workoutCopySource>('workout');
}
