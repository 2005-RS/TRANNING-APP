import { createRoute, lazyRouteComponent, redirect } from '@tanstack/react-router';
import { TrainerRoleLayout } from '@/app/shells/role-layouts';
import { documentTitleFor, trainerCopy } from '@/features/navigation/copy';
import { getRouteMeta } from '@/features/navigation/route-meta';
import {
  validateClientsSearch,
  validateDashboardSearch,
  validateExercisesSearch,
  validateListSearch,
  validateTrainerProgressSearch,
} from '@/features/trainer-workspace/lib/search';
import { rootRoute } from '@/routes/__root';
import { RoutePlaceholderPage } from '@/routes/placeholder-page';

export const trainerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/trainer',
  component: TrainerRoleLayout,
});

const trainerIndexRoute = createRoute({
  getParentRoute: () => trainerRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/trainer/dashboard' });
  },
});

const dashboardMeta = getRouteMeta('/trainer/dashboard');
const trainerDashboardRoute = createRoute({
  getParentRoute: () => trainerRoute,
  path: 'dashboard',
  validateSearch: validateDashboardSearch,
  staticData: dashboardMeta,
  head: () => ({ meta: [{ title: dashboardMeta.documentTitle }] }),
  component: lazyRouteComponent(
    () => import('@/features/trainer-workspace/components/trainer-dashboard-page'),
    'TrainerDashboardPage',
  ),
});

const clientsMeta = getRouteMeta('/trainer/clients');
const trainerClientsRoute = createRoute({
  getParentRoute: () => trainerRoute,
  path: 'clients',
  validateSearch: validateClientsSearch,
  staticData: clientsMeta,
  head: () => ({ meta: [{ title: clientsMeta.documentTitle }] }),
  component: lazyRouteComponent(
    () => import('@/features/trainer-workspace/components/trainer-clients-page'),
    'TrainerClientsPage',
  ),
});

const clientWorkspaceMeta = {
  title: 'Client',
  documentTitle: documentTitleFor('Client'),
  description: trainerCopy.clients.description,
};

const trainerClientWorkspaceRoute = createRoute({
  getParentRoute: () => trainerRoute,
  path: 'clients/$clientId',
  staticData: clientWorkspaceMeta,
  head: () => ({ meta: [{ title: clientWorkspaceMeta.documentTitle }] }),
  component: lazyRouteComponent(
    () => import('@/features/trainer-workspace/components/trainer-client-workspace-layout'),
    'TrainerClientWorkspaceLayout',
  ),
});

const trainerClientIndexRoute = createRoute({
  getParentRoute: () => trainerClientWorkspaceRoute,
  path: '/',
  staticData: { title: 'Overview', documentTitle: documentTitleFor('Overview') },
  head: () => ({ meta: [{ title: documentTitleFor('Overview') }] }),
  component: lazyRouteComponent(
    () => import('@/features/trainer-workspace/components/trainer-client-overview-page'),
    'TrainerClientOverviewPage',
  ),
});

const trainerClientTrainingRoute = createRoute({
  getParentRoute: () => trainerClientWorkspaceRoute,
  path: 'training',
  staticData: { title: 'Training', documentTitle: documentTitleFor('Training') },
  head: () => ({ meta: [{ title: documentTitleFor('Training') }] }),
  component: lazyRouteComponent(
    () => import('@/features/trainer-workspace/components/trainer-client-training-page'),
    'TrainerClientTrainingPage',
  ),
});

const trainerClientTrainingDetailRoute = createRoute({
  getParentRoute: () => trainerClientWorkspaceRoute,
  path: 'training/$planId',
  staticData: { title: 'Training plan', documentTitle: documentTitleFor('Training plan') },
  head: () => ({ meta: [{ title: documentTitleFor('Training plan') }] }),
  component: lazyRouteComponent(
    () => import('@/features/trainer-workspace/components/trainer-training-plan-detail-page'),
    'TrainerTrainingPlanDetailPage',
  ),
});

const trainerClientProgressRoute = createRoute({
  getParentRoute: () => trainerClientWorkspaceRoute,
  path: 'progress',
  validateSearch: validateTrainerProgressSearch,
  staticData: { title: 'Progress', documentTitle: documentTitleFor('Progress') },
  head: () => ({ meta: [{ title: documentTitleFor('Progress') }] }),
  component: lazyRouteComponent(
    () => import('@/features/trainer-workspace/components/trainer-client-progress-page'),
    'TrainerClientProgressPage',
  ),
});

const trainerClientExerciseProgressRoute = createRoute({
  getParentRoute: () => trainerClientWorkspaceRoute,
  path: 'progress/exercises/$exerciseId',
  validateSearch: validateTrainerProgressSearch,
  staticData: { title: 'Exercise progress', documentTitle: documentTitleFor('Exercise progress') },
  head: () => ({ meta: [{ title: documentTitleFor('Exercise progress') }] }),
  component: lazyRouteComponent(
    () => import('@/features/trainer-workspace/components/trainer-exercise-progress-page'),
    'TrainerExerciseProgressPage',
  ),
});

const trainerClientBodyRoute = createRoute({
  getParentRoute: () => trainerClientWorkspaceRoute,
  path: 'body',
  staticData: { title: 'Body progress', documentTitle: documentTitleFor('Body progress') },
  head: () => ({ meta: [{ title: documentTitleFor('Body progress') }] }),
  component: lazyRouteComponent(
    () => import('@/features/trainer-workspace/components/trainer-client-body-page'),
    'TrainerClientBodyPage',
  ),
});

const trainerClientNutritionRoute = createRoute({
  getParentRoute: () => trainerClientWorkspaceRoute,
  path: 'nutrition',
  staticData: { title: 'Nutrition', documentTitle: documentTitleFor('Nutrition') },
  head: () => ({ meta: [{ title: documentTitleFor('Nutrition') }] }),
  component: lazyRouteComponent(
    () => import('@/features/trainer-workspace/components/trainer-client-nutrition-page'),
    'TrainerClientNutritionPage',
  ),
});

const trainerClientNutritionDetailRoute = createRoute({
  getParentRoute: () => trainerClientWorkspaceRoute,
  path: 'nutrition/$planId',
  staticData: { title: 'Nutrition plan', documentTitle: documentTitleFor('Nutrition plan') },
  head: () => ({ meta: [{ title: documentTitleFor('Nutrition plan') }] }),
  component: lazyRouteComponent(
    () => import('@/features/trainer-workspace/components/trainer-nutrition-plan-detail-page'),
    'TrainerNutritionPlanDetailPage',
  ),
});

const trainerClientCheckInsRoute = createRoute({
  getParentRoute: () => trainerClientWorkspaceRoute,
  path: 'check-ins',
  staticData: { title: 'Check-ins', documentTitle: documentTitleFor('Check-ins') },
  head: () => ({ meta: [{ title: documentTitleFor('Check-ins') }] }),
  component: lazyRouteComponent(
    () => import('@/features/trainer-workspace/components/trainer-client-check-ins-page'),
    'TrainerClientCheckInsPage',
  ),
});

const trainerClientCheckInDetailRoute = createRoute({
  getParentRoute: () => trainerClientWorkspaceRoute,
  path: 'check-ins/$checkInId',
  staticData: { title: 'Check-in review', documentTitle: documentTitleFor('Check-in review') },
  head: () => ({ meta: [{ title: documentTitleFor('Check-in review') }] }),
  component: lazyRouteComponent(
    () => import('@/features/trainer-workspace/components/trainer-check-in-review-page'),
    'TrainerCheckInReviewPage',
  ),
});

const checkInsMeta = getRouteMeta('/trainer/check-ins');
const trainerCheckInsQueueRoute = createRoute({
  getParentRoute: () => trainerRoute,
  path: 'check-ins',
  staticData: checkInsMeta,
  head: () => ({ meta: [{ title: checkInsMeta.documentTitle }] }),
  component: lazyRouteComponent(
    () => import('@/features/trainer-workspace/components/trainer-check-ins-queue-page'),
    'TrainerCheckInsQueuePage',
  ),
});

const trainingMeta = getRouteMeta('/trainer/training');
const trainerTemplatesRoute = createRoute({
  getParentRoute: () => trainerRoute,
  path: 'training',
  validateSearch: validateListSearch,
  staticData: trainingMeta,
  head: () => ({ meta: [{ title: trainingMeta.documentTitle }] }),
  component: lazyRouteComponent(
    () => import('@/features/trainer-workspace/components/trainer-templates-page'),
    'TrainerTemplatesPage',
  ),
});

const trainerTemplateDetailRoute = createRoute({
  getParentRoute: () => trainerRoute,
  path: 'training/$templateId',
  staticData: { title: 'Template', documentTitle: documentTitleFor('Template') },
  head: () => ({ meta: [{ title: documentTitleFor('Template') }] }),
  component: lazyRouteComponent(
    () => import('@/features/trainer-workspace/components/trainer-template-detail-page'),
    'TrainerTemplateDetailPage',
  ),
});

const nutritionMeta = getRouteMeta('/trainer/nutrition');
const trainerFoodsRoute = createRoute({
  getParentRoute: () => trainerRoute,
  path: 'nutrition',
  validateSearch: validateListSearch,
  staticData: nutritionMeta,
  head: () => ({ meta: [{ title: nutritionMeta.documentTitle }] }),
  component: lazyRouteComponent(
    () => import('@/features/trainer-workspace/components/trainer-foods-page'),
    'TrainerFoodsPage',
  ),
});

const exercisesMeta = getRouteMeta('/trainer/exercises');
const trainerExercisesRoute = createRoute({
  getParentRoute: () => trainerRoute,
  path: 'exercises',
  validateSearch: validateExercisesSearch,
  head: () => ({ meta: [{ title: exercisesMeta.documentTitle }] }),
  component: lazyRouteComponent(
    () => import('@/features/trainer-workspace/components/trainer-exercises-page'),
    'TrainerExercisesPage',
  ),
});

const trainerExerciseDetailRoute = createRoute({
  getParentRoute: () => trainerRoute,
  path: 'exercises/$exerciseId',
  staticData: { title: 'Exercise', documentTitle: documentTitleFor('Exercise') },
  head: () => ({ meta: [{ title: documentTitleFor('Exercise') }] }),
  component: lazyRouteComponent(
    () => import('@/features/trainer-workspace/components/trainer-exercise-detail-page'),
    'TrainerExerciseDetailPage',
  ),
});

const notificationsMeta = getRouteMeta('/trainer/notifications');
const trainerNotificationsRoute = createRoute({
  getParentRoute: () => trainerRoute,
  path: 'notifications',
  staticData: notificationsMeta,
  head: () => ({ meta: [{ title: notificationsMeta.documentTitle }] }),
  component: RoutePlaceholderPage,
});

export const trainerRouteTree = trainerRoute.addChildren([
  trainerIndexRoute,
  trainerDashboardRoute,
  trainerClientsRoute,
  trainerClientWorkspaceRoute.addChildren([
    trainerClientIndexRoute,
    trainerClientTrainingRoute,
    trainerClientTrainingDetailRoute,
    trainerClientProgressRoute,
    trainerClientExerciseProgressRoute,
    trainerClientBodyRoute,
    trainerClientNutritionRoute,
    trainerClientNutritionDetailRoute,
    trainerClientCheckInsRoute,
    trainerClientCheckInDetailRoute,
  ]),
  trainerCheckInsQueueRoute,
  trainerTemplatesRoute,
  trainerTemplateDetailRoute,
  trainerFoodsRoute,
  trainerExercisesRoute,
  trainerExerciseDetailRoute,
  trainerNotificationsRoute,
]);
