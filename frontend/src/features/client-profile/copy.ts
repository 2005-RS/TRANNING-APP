import { createLiveCopy, registerEnglishNamespace } from '@/i18n/live-copy';
import { useLiveCopy } from '@/i18n/use-live-copy';

export const clientProfileCopySource = {
  title: 'My profile',
  description: 'Review your account and update your training preferences.',
  account: 'Account',
  name: 'Name',
  email: 'Email',
  emailHint: 'To change your email, write to support.',
  phone: 'Phone',
  primaryGoal: 'Primary goal',
  experienceLevel: 'Experience level',
  goalNotes: 'Goal notes',
  goalNotesHint: 'Optional details to help guide your training.',
  save: 'Save changes',
  saving: 'Saving changes',
  saved: 'Profile updated.',
  saveError: 'We could not save your profile. Try again.',
  phoneInvalid: 'Use only digits and phone symbols (+, -, spaces).',
  selectRequired: 'Choose an option.',
  preferences: 'Training preferences',
  security: 'Security',
  retry: 'Try again',
  changePassword: 'Change password',
  changePasswordHint: 'We will send a link to your email.',
  logout: 'Sign out',
} as const;

registerEnglishNamespace('clientProfile', clientProfileCopySource);
export const clientProfileCopy = createLiveCopy<typeof clientProfileCopySource>('clientProfile');

export function useClientProfileCopy() {
  return useLiveCopy<typeof clientProfileCopySource>('clientProfile');
}
