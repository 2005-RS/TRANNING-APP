import { createLiveCopy, registerEnglishNamespace } from '@/i18n/live-copy';
import { useLiveCopy } from '@/i18n/use-live-copy';

export const clientSubscriptionCopySource = {
  title: 'My plan',
  free: 'Free',
  pro: 'Pro',
  complimentary: 'Pro (complimentary)',
  until: 'Pro until {{date}}',
  freeMeaning: 'Train with ready-made routines and track your progress independently.',
  proMeaning: 'Your trainer supports you with a plan built around you.',
  benefits: 'Pro adds a trainer, custom plans, and check-in reviews.',
  renew: 'Renew',
  instructions: 'SINPE M\u00f3vil instructions',
  unavailable: 'Payments are not enabled yet. Write to us to activate Pro.',
  pending: 'Payment under review',
  rejected: 'Payment rejected: {{reason}}',
  report: 'I already paid: report payment',
  reference: 'Receipt number',
  paidOn: 'Payment date',
  payerPhone: 'Payer phone (optional)',
  submit: 'Report payment',
  reporting: 'Reporting...',
  copyPhone: 'Copy phone',
  stepOne: 'Open your banking app.',
  stepTwo: 'Send a SINPE M\u00f3vil payment with these details:',
  stepThree: 'Report the receipt number here.',
  tooMany: 'Too many attempts. Try again later.',
  invalid: 'Review the payment details and try again.',
  pendingConflict: 'You already have a payment under review.',
  unavailableError: 'Payments are not configured right now.',
  referenceUsed: 'This receipt number has already been used.',
  invalidDate: 'Choose a payment date from the last 30 days.',
  offline: 'We could not connect. Check your connection and try again.',
  referenceRequired: 'Enter the receipt number.',
  referenceLength: 'Use at most 40 characters.',
  payerPhoneInvalid: 'Enter an 8-digit phone number.',
  comparisonTitle: 'Free vs Pro',
  freePlan: 'Free',
  proPlan: 'Pro',
  includes: 'Your plan includes',
  freeFeatures: [
    'Routine library',
    'Workout logging',
    'Progress and measurements',
    'Food diary',
    'Assistant',
  ],
  proFeatures: [
    'Everything in Free',
    'Assigned trainer',
    'Personal training and nutrition plan',
    'Check-in reviews',
  ],
  paymentTimeline: 'Payment status',
  reported: 'Reported',
  reviewing: 'Under review',
  active: 'Active',
  rejectedStatus: 'Rejected',
  referenceDate: '{{reference}} \u00b7 {{date}}',
  phone: 'Phone number',
  holder: 'Account holder',
  amount: 'Amount',
} as const;

registerEnglishNamespace('clientSubscription', clientSubscriptionCopySource);

export const clientSubscriptionCopy = createLiveCopy<typeof clientSubscriptionCopySource>(
  'clientSubscription',
);

export function useClientSubscriptionCopy() {
  return useLiveCopy<typeof clientSubscriptionCopySource>('clientSubscription');
}

export type ClientSubscriptionCopy = ReturnType<typeof useClientSubscriptionCopy>;
