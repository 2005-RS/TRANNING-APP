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
    title: 'Train with precision.',
    body: 'Plans, sessions, and progress in one quiet surface for coaches and athletes.',
    footer: 'Private training, signed in.',
  },
  login: {
    title: 'Sign in',
    subtitle: 'Use the account your coach or administrator created.',
    emailLabel: 'Email',
    passwordLabel: 'Password',
    submit: 'Sign in',
    submitting: 'Signing in',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
  },
  register: {
    title: 'Create your free account',
    subtitle: 'Start tracking your training, nutrition, and progress today.',
    firstNameLabel: 'First name',
    lastNameLabel: 'Last name',
    primaryGoalLabel: 'Primary goal',
    experienceLevelLabel: 'Experience level',
    acceptTerms: 'I accept the terms and privacy policy',
    submit: 'Create free account',
    submitting: 'Creating account',
    goals: {
      FAT_LOSS: 'Fat loss',
      MUSCLE_GAIN: 'Muscle gain',
      STRENGTH: 'Strength',
      GENERAL_FITNESS: 'General fitness',
      MAINTENANCE: 'Maintenance',
      OTHER: 'Other',
    },
    levels: {
      BEGINNER: 'Beginner',
      INTERMEDIATE: 'Intermediate',
      ADVANCED: 'Advanced',
    },
  },
  signUp: {
    prompt: 'No account yet?',
    link: 'Create a free account',
    signInPrompt: 'Already have an account?',
    signInLink: 'Sign in',
  },
  validation: {
    emailRequired: 'Enter your email',
    emailInvalid: 'Enter a valid email',
    passwordRequired: 'Enter your password',
    firstNameRequired: 'Enter your first name',
    lastNameRequired: 'Enter your last name',
    primaryGoalRequired: 'Choose your primary goal',
    experienceLevelRequired: 'Choose your experience level',
    termsRequired: 'Accept the terms and privacy policy to continue',
    passwordLength: 'Password must be between 12 and 128 characters',
  },
  errors: {
    invalidCredentials: 'Email or password is incorrect.',
    rateLimited: 'Too many attempts. Wait a moment and try again.',
    network: 'Unable to connect. Check your connection and try again.',
    server: 'Something went wrong. Try again in a moment.',
    generic: 'Unable to sign in right now. Try again.',
    duplicateEmail: 'An account already exists with this email.',
    registerRateLimited: 'Too many attempts. Wait a minute and try again.',
    registerInvalid: 'Check your details and try again.',
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
