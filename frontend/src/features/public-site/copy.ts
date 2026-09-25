import { createLiveCopy, registerEnglishNamespace } from '@/i18n/live-copy';
import { useLiveCopy } from '@/i18n/use-live-copy';

/**
 * Public website copy. Describe only capabilities the app ships
 * (docs/frontend/route-map.md). No prices, sign-up, testimonials or statistics.
 */
export const publicSiteCopySource = {
  nav: {
    label: 'Site',
    home: 'Home',
    platform: 'Platform',
    training: 'Training',
    progress: 'Progress',
    about: 'About',
    signIn: 'Sign in',
    goToApp: 'Go to my workspace',
    openMenu: 'Open site menu',
    closeMenu: 'Close site menu',
  },
  footer: {
    note: 'Private coaching platform for trainers and their clients.',
    access: 'There is no public sign-up. Accounts are created by an administrator.',
  },
  accessNote:
    'There is no public sign-up. The administrator of the organisation that uses the platform creates your account.',
  cta: {
    title: 'Already have an account?',
    body: 'Sign in with the email and password your trainer or administrator gave you.',
    signIn: 'Sign in',
  },
  assistant: {
    title: 'Questions? Ask Training Assistant',
    body: 'Use the chat button in the corner of the screen to ask how the platform works. It only knows public information about the product — no one’s account or personal data.',
  },
  home: {
    title: 'Home',
    eyebrow: 'Coaching workspace',
    heading: 'Train with precision.',
    body: 'Plans, sessions, and progress in one quiet surface for coaches and athletes.',
    primary: 'Sign in',
    secondary: 'Explore the platform',
    rolesTitle: 'One platform, three roles',
    roles: {
      client: {
        title: 'Clients',
        body: 'Follow the plan your trainer assigns, record every set in a focused workout mode, and see your progress over time.',
      },
      trainer: {
        title: 'Trainers',
        body: 'Build training and nutrition plans for assigned clients, review their progress, and give feedback on check-ins.',
      },
      admin: {
        title: 'Administrators',
        body: 'Create trainer and client accounts, assign each client to a trainer, and manage the exercise and food catalogs.',
      },
    },
    stepsTitle: 'How it works',
    steps: {
      one: {
        title: 'Accounts are created',
        body: 'An administrator creates trainer and client accounts and assigns each client to a trainer.',
      },
      two: {
        title: 'The trainer plans',
        body: 'The trainer builds a training plan from workout templates and, if needed, a nutrition plan.',
      },
      three: {
        title: 'The client trains',
        body: 'The client starts workouts from the plan, records sets, and completes the session.',
      },
      four: {
        title: 'Progress is reviewed',
        body: 'The client tracks progress and submits check-ins; the trainer reviews them and replies with feedback.',
      },
    },
  },
  platform: {
    title: 'Platform',
    eyebrow: 'Platform',
    heading: 'Everything a coaching relationship needs, in one place.',
    body: 'Each role sees only its own workspace, and each trainer only sees the clients assigned to them.',
    modules: {
      training: {
        title: 'Training plans',
        body: 'Trainers create plans for each client from reusable workout templates and adjust exercises, sets, and targets.',
      },
      focus: {
        title: 'Workout focus mode',
        body: 'Clients record repetitions and weight set by set, with a rest timer, then complete or cancel the session.',
      },
      progress: {
        title: 'Progress',
        body: 'Exercise history and trends, plus body-measurement trends over 7 to 365 days.',
      },
      body: {
        title: 'Body progress & photos',
        body: 'Clients record body measurements and upload private progress photos to compare over time.',
      },
      nutrition: {
        title: 'Nutrition plans',
        body: 'Trainers prescribe daily targets, meals, and foods; clients see their plan in a read-only view.',
      },
      checkIns: {
        title: 'Check-ins',
        body: 'Clients describe how a period went; trainers review each check-in and write feedback.',
      },
      trainer: {
        title: 'Trainer workspace',
        body: 'A dashboard with an attention queue, the list of assigned clients, and a detailed view of each client.',
      },
      admin: {
        title: 'Administration',
        body: 'Accounts, trainer–client assignments, and the shared exercise and food catalogs.',
      },
    },
  },
  training: {
    title: 'Training',
    eyebrow: 'Training',
    heading: 'From the trainer’s plan to every recorded set.',
    body: 'The trainer designs the program; the client follows it without guesswork.',
    features: {
      templates: {
        title: 'Workout templates',
        body: 'Trainers keep a library of reusable workouts with prescribed exercises, sets, repetitions, and rest.',
      },
      plans: {
        title: 'Plans per client',
        body: 'A training plan is built for a specific client, can be adjusted, and moves through clear statuses.',
      },
      start: {
        title: 'Start or resume',
        body: 'Clients start a workout from their current plan, or pick up a session that is already in progress.',
      },
      sets: {
        title: 'Set-by-set recording',
        body: 'Large, gym-friendly controls to log repetitions and weight for each set.',
      },
      rest: {
        title: 'Rest timer',
        body: 'A local rest timer between sets keeps the session moving.',
      },
      exercises: {
        title: 'Exercise library',
        body: 'A shared exercise catalog, with demonstration media where available.',
      },
    },
  },
  progress: {
    title: 'Progress',
    eyebrow: 'Progress',
    heading: 'See what is changing, without the noise.',
    body: 'Neutral numbers and trends. Interpretation stays between the client and their trainer.',
    features: {
      exercises: {
        title: 'Exercise history',
        body: 'Each exercise keeps its history and trend, so progress is visible session after session.',
      },
      measurements: {
        title: 'Body measurements',
        body: 'Record and edit measurements and review trends for 7, 30, 90, 180, or 365 days.',
      },
      photos: {
        title: 'Private progress photos',
        body: 'Photos are stored privately and shown only to the client and their assigned trainer.',
      },
      checkIns: {
        title: 'Check-ins with feedback',
        body: 'Save a check-in as a draft, submit it, and read the trainer’s feedback once it is reviewed.',
      },
    },
  },
  about: {
    title: 'About',
    eyebrow: 'About',
    heading: 'A private workspace for coaching.',
    body: 'Training Platform connects trainers with the clients assigned to them. It is designed for organisations that coach people, not as an open social network.',
    sections: {
      privacy: {
        title: 'Private by design',
        body: 'Fitness data is private. Clients see their own data; trainers see only their assigned clients; administrators manage accounts, not coaching.',
      },
      access: {
        title: 'Access',
        body: 'There is no public sign-up and no payments in the app. Accounts are created by an administrator of the organisation.',
      },
      assistant: {
        title: 'Training Assistant',
        body: 'An AI assistant answers questions about how the platform works. It is not a doctor and does not give medical advice.',
      },
      languages: {
        title: 'Languages',
        body: 'The interface is available in Spanish and English.',
      },
    },
  },
} as const;

registerEnglishNamespace('publicSite', publicSiteCopySource);
export const publicSiteCopy = createLiveCopy<typeof publicSiteCopySource>('publicSite');

export function usePublicSiteCopy() {
  return useLiveCopy<typeof publicSiteCopySource>('publicSite');
}
