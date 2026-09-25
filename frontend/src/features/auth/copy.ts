import { createLiveCopy, registerEnglishNamespace } from '@/i18n/live-copy';
import { useLiveCopy } from '@/i18n/use-live-copy';

export const authCopySource = {
  productName: 'Training Platform',
  brandSlotLabel: 'Training Platform',
  backToSite: 'Training Platform — back to the website',
  boot: {
    status: 'Restoring your session',
  },
  restore: {
    title: 'Unable to restore your session.',
    body: 'Check your connection and try again.',
    retry: 'Retry',
    retrying: 'Retrying',
    goToSignIn: 'Go to sign in',
  },
  hero: {
    eyebrow: 'Coaching workspace',
    title: 'Train with precision.',
    body: 'Plans, sessions, and progress in one quiet surface for coaches and athletes.',
    footer: 'Private training, signed in.',
  },
  login: {
    mobileEyebrow: 'Training Platform',
    title: 'Sign in',
    subtitle: 'Use the account your coach or administrator created.',
    emailLabel: 'Email',
    passwordLabel: 'Password',
    submit: 'Sign in',
    submitting: 'Signing in',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
  },
  validation: {
    emailRequired: 'Enter your email',
    emailInvalid: 'Enter a valid email',
    passwordRequired: 'Enter your password',
  },
  errors: {
    invalidCredentials: 'Email or password is incorrect.',
    rateLimited: 'Too many attempts. Wait a moment and try again.',
    network: 'Unable to connect. Check your connection and try again.',
    server: 'Something went wrong. Try again in a moment.',
    generic: 'Unable to sign in right now. Try again.',
    supportHint: 'Support reference',
  },
  session: {
    temporaryNote: 'You are signed in.',
    signedInAs: 'Signed in',
    role: 'Role',
    logout: 'Sign out',
    logoutAll: 'Sign out everywhere',
    signingOut: 'Signing out',
    signedOut: 'Signed out',
    signedOutAll: 'Signed out everywhere',
  },
  theme: {
    cycle: 'Appearance',
  },
} as const;

registerEnglishNamespace('auth', authCopySource);
export const authCopy = createLiveCopy<typeof authCopySource>('auth');

export function useAuthCopy() {
  return useLiveCopy<typeof authCopySource>('auth');
}
