import { createRoute, lazyRouteComponent, redirect } from '@tanstack/react-router';
import { ClientRoleLayout } from '@/app/shells/role-layouts';
import { clientCopy, documentTitleFor } from '@/features/navigation/copy';
import { type AppPath, getRouteMeta } from '@/features/navigation/route-meta';
import { validateProgressSearch } from '@/features/client-progress/lib/progress-search';
import { rootRoute } from '@/routes/__root';
import { RoutePlaceholderPage } from '@/routes/placeholder-page';

export const clientRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/client',
  component: ClientRoleLayout,
});

const clientIndexRoute = createRoute({
  getParentRoute: () => clientRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/client/dashboard' });
  },
});

const clientDashboardMeta = getRouteMeta('/client/dashboard');

const clientDashboardRoute = createRoute({
  getParentRoute: () => clientRoute,
  path: 'dashboard',
  staticData: clientDashboardMeta,
    head: () => ({
      meta: [{ title: getRouteMeta('/client/dashboard').documentTitle }],
    }),
  component: lazyRouteComponent(
    () => import('@/features/client-dashboard/components/client-dashboard-page'),
    'ClientDashboardPage',
  ),
});

const clientTrainingMeta = getRouteMeta('/client/training');

const clientTrainingRoute = createRoute({
  getParentRoute: () => clientRoute,
  path: 'training',
  staticData: clientTrainingMeta,
  head: () => ({
    meta: [{ title: clientTrainingMeta.documentTitle }],
  }),
  component: lazyRouteComponent(
    () => import('@/features/workout-session/components/training-hub-page'),
    'TrainingHubPage',
  ),
});

const clientWorkoutMeta = {
  title: clientCopy.workout.title,
  documentTitle: documentTitleFor(clientCopy.workout.title),
  description: clientCopy.workout.description,
};

const clientWorkoutRoute = createRoute({
  getParentRoute: () => clientRoute,
  path: 'workout/$sessionId',
  staticData: clientWorkoutMeta,
  head: () => ({
    meta: [{ title: clientWorkoutMeta.documentTitle }],
  }),
  component: lazyRouteComponent(
    () => import('@/features/workout-session/components/workout-focus-page'),
    'WorkoutFocusPage',
  ),
});

const clientProgressMeta = getRouteMeta('/client/progress');

const clientProgressRoute = createRoute({
  getParentRoute: () => clientRoute,
  path: 'progress',
  validateSearch: validateProgressSearch,
  staticData: clientProgressMeta,
  head: () => ({
    meta: [{ title: clientProgressMeta.documentTitle }],
  }),
  component: lazyRouteComponent(
    () => import('@/features/client-progress/components/client-progress-page'),
    'ClientProgressPage',
  ),
});

const clientExerciseProgressMeta = {
  title: clientCopy.progress.title,
  documentTitle: documentTitleFor(clientCopy.progress.title),
  description: clientCopy.progress.description,
};

const clientExerciseProgressRoute = createRoute({
  getParentRoute: () => clientRoute,
  path: 'progress/exercises/$exerciseId',
  validateSearch: validateProgressSearch,
  staticData: clientExerciseProgressMeta,
  head: () => ({
    meta: [{ title: clientExerciseProgressMeta.documentTitle }],
  }),
  component: lazyRouteComponent(
    () => import('@/features/client-progress/components/exercise-progress-page'),
    'ExerciseProgressPage',
  ),
});

const clientBodyMeta = getRouteMeta('/client/body');

const clientBodyRoute = createRoute({
  getParentRoute: () => clientRoute,
  path: 'body',
  staticData: clientBodyMeta,
  head: () => ({
    meta: [{ title: clientBodyMeta.documentTitle }],
  }),
  component: lazyRouteComponent(
    () => import('@/features/client-body/components/client-body-page'),
    'ClientBodyPage',
  ),
});

const clientNutritionMeta = getRouteMeta('/client/nutrition');

const clientNutritionRoute = createRoute({
  getParentRoute: () => clientRoute,
  path: 'nutrition',
  staticData: clientNutritionMeta,
  head: () => ({
    meta: [{ title: clientNutritionMeta.documentTitle }],
  }),
  component: lazyRouteComponent(
    () => import('@/features/client-nutrition/components/client-nutrition-page'),
    'ClientNutritionPage',
  ),
});

const clientCheckInsMeta = getRouteMeta('/client/check-ins');

const clientCheckInsRoute = createRoute({
  getParentRoute: () => clientRoute,
  path: 'check-ins',
  staticData: clientCheckInsMeta,
  head: () => ({
    meta: [{ title: clientCheckInsMeta.documentTitle }],
  }),
  component: lazyRouteComponent(
    () => import('@/features/client-check-ins/components/client-check-ins-page'),
    'ClientCheckInsPage',
  ),
});

const clientCheckInDetailMeta = {
  title: clientCopy.checkIns.title,
  documentTitle: documentTitleFor(clientCopy.checkIns.title),
  description: clientCopy.checkIns.description,
};

const clientCheckInDetailRoute = createRoute({
  getParentRoute: () => clientRoute,
  path: 'check-ins/$checkInId',
  staticData: clientCheckInDetailMeta,
  head: () => ({
    meta: [{ title: clientCheckInDetailMeta.documentTitle }],
  }),
  component: lazyRouteComponent(
    () => import('@/features/client-check-ins/components/client-check-in-detail-page'),
    'ClientCheckInDetailPage',
  ),
});

function clientPage<TPath extends string>(path: TPath, key: AppPath) {
  return createRoute({
    getParentRoute: () => clientRoute,
    path,
    staticData: getRouteMeta(key),
    head: () => ({
      meta: [{ title: getRouteMeta(key).documentTitle }],
    }),
    component: RoutePlaceholderPage,
  });
}

export const clientRouteTree = clientRoute.addChildren([
  clientIndexRoute,
  clientDashboardRoute,
  clientTrainingRoute,
  clientWorkoutRoute,
  clientProgressRoute,
  clientExerciseProgressRoute,
  clientBodyRoute,
  clientNutritionRoute,
  clientCheckInsRoute,
  clientCheckInDetailRoute,
  clientPage('notifications', '/client/notifications'),
]);
