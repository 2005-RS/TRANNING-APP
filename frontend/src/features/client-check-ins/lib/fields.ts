export const CHECK_IN_RATING_FIELDS = [
  'sleepQuality',
  'energyLevel',
  'stressLevel',
  'hungerLevel',
  'recoveryLevel',
] as const;

export type CheckInRatingField = (typeof CHECK_IN_RATING_FIELDS)[number];

export const CHECK_IN_ADHERENCE_FIELDS = [
  'trainingAdherencePct',
  'nutritionAdherencePct',
] as const;

export type CheckInAdherenceField = (typeof CHECK_IN_ADHERENCE_FIELDS)[number];

export const CHECK_IN_TEXT_FIELDS = ['wins', 'challenges', 'generalNotes'] as const;

export type CheckInTextField = (typeof CHECK_IN_TEXT_FIELDS)[number];

export const CHECK_IN_RATING_MIN = 1;
export const CHECK_IN_RATING_MAX = 5;
export const CHECK_IN_ADHERENCE_MIN = 0;
export const CHECK_IN_ADHERENCE_MAX = 100;
export const CHECK_IN_TEXT_MAX_LENGTH = 2000;
