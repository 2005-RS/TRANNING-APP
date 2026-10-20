import { createLiveCopy, registerEnglishNamespace } from '@/i18n/live-copy';
import { useLiveCopy } from '@/i18n/use-live-copy';

export const clientWelcomeCopySource = {
  progress: (step: number) => `Step ${step} of 3`,
  skip: 'Skip',
  welcome: 'Welcome, {{name}}!',
  value: 'Train with ready-made routines, and log your progress and nutrition.',
  next: 'Continue',
  choose: 'Choose your first routine',
  useRoutine: 'Use this routine',
  ready: 'All set!',
  readyBody: 'Your routine is ready.',
  start: 'Start now',
  home: 'Go to home',
  loading: 'Loading routines',
  empty: 'No routines are available yet.',
  failed: 'We could not create your routine. Try again.',
} as const;

registerEnglishNamespace('clientWelcome', clientWelcomeCopySource);
export const clientWelcomeCopy = createLiveCopy<typeof clientWelcomeCopySource>('clientWelcome');
export function useClientWelcomeCopy() {
  return useLiveCopy<typeof clientWelcomeCopySource>('clientWelcome');
}
