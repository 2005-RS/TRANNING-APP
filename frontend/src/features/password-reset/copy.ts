import { createLiveCopy, registerEnglishNamespace } from '@/i18n/live-copy';
import { useLiveCopy } from '@/i18n/use-live-copy';

export const passwordResetCopySource = {
  forgotLink: 'Forgot your password?',
  backToSignIn: 'Back to sign in',
  forgot: {
    title: 'Reset your password',
    subtitle: 'Enter the email you sign in with. We will send you a link to choose a new password.',
    emailLabel: 'Email',
    submit: 'Send reset link',
    submitting: 'Sending',
    sentTitle: 'Check your email',
    sentBody: (email: string) =>
      `If an account exists for ${email}, a reset link is on its way. The link works once and expires in 30 minutes.`,
    sendAnother: 'Use a different email',
  },
  reset: {
    title: 'Choose a new password',
    subtitle: 'Signing in again will be required on every device.',
    passwordLabel: 'New password',
    confirmLabel: 'Confirm new password',
    passwordHint: 'At least 12 characters.',
    submit: 'Save new password',
    submitting: 'Saving',
    doneTitle: 'Password updated',
    doneBody: 'Your password was changed and every session was signed out. Sign in with the new password.',
    signIn: 'Sign in',
    invalidTitle: 'This link cannot be used',
    invalidBody: 'Reset links work once and expire after 30 minutes. Request a new one to continue.',
    requestNew: 'Request a new link',
  },
  validation: {
    emailRequired: 'Enter your email',
    emailInvalid: 'Enter a valid email',
    passwordLength: 'Use between 12 and 128 characters.',
    passwordMismatch: 'The passwords do not match.',
  },
  errors: {
    rateLimited: 'Too many attempts. Wait a minute and try again.',
    network: 'Unable to connect. Check your connection and try again.',
    generic: 'Something went wrong. Try again in a moment.',
  },
} as const;

registerEnglishNamespace('passwordReset', passwordResetCopySource);
export const passwordResetCopy = createLiveCopy<typeof passwordResetCopySource>('passwordReset');

export function usePasswordResetCopy() {
  return useLiveCopy<typeof passwordResetCopySource>('passwordReset');
}
