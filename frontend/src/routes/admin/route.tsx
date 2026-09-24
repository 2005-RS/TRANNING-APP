import { createRoute, lazyRouteComponent, redirect } from '@tanstack/react-router';
import { AdminRoleLayout } from '@/app/shells/role-layouts';
import { documentTitleFor } from '@/features/navigation/copy';
import { getRouteMeta } from '@/features/navigation/route-meta';
import {
  validateAdminCatalogSearch,
  validateAdminClientsSearch,
  validateAdminDashboardSearch,
  validateAdminExercisesSearch,
  validateAdminPeopleSearch,
} from '@/features/admin-workspace/lib/search';
import { rootRoute } from '@/routes/__root';
import { RoutePlaceholderPage } from '@/routes/placeholder-page';

export const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin',
  component: AdminRoleLayout,
});

const adminIndexRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/admin/dashboard' });
  },
});

const dashboardMeta = getRouteMeta('/admin/dashboard');
const adminDashboardRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: 'dashboard',
  validateSearch: validateAdminDashboardSearch,
  staticData: dashboardMeta,
  head: () => ({ meta: [{ title: dashboardMeta.documentTitle }] }),
  component: lazyRouteComponent(
    () => import('@/features/admin-workspace/components/admin-dashboard-page'),
    'AdminDashboardPage',
  ),
});

const trainersMeta = getRouteMeta('/admin/trainers');
const adminTrainersRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: 'trainers',
  validateSearch: validateAdminPeopleSearch,
  staticData: trainersMeta,
  head: () => ({ meta: [{ title: trainersMeta.documentTitle }] }),
  component: lazyRouteComponent(
    () => import('@/features/admin-workspace/components/admin-trainers-page'),
    'AdminTrainersPage',
  ),
});

const adminTrainerDetailRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: 'trainers/$trainerId',
  staticData: { title: 'Trainer', documentTitle: documentTitleFor('Trainer'), description: trainersMeta.description },
  head: () => ({ meta: [{ title: documentTitleFor('Trainer') }] }),
  component: lazyRouteComponent(
    () => import('@/features/admin-workspace/components/admin-trainers-page'),
    'AdminTrainerDetailPage',
  ),
});

const clientsMeta = getRouteMeta('/admin/clients');
const adminClientsRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: 'clients',
  validateSearch: validateAdminClientsSearch,
  staticData: clientsMeta,
  head: () => ({ meta: [{ title: clientsMeta.documentTitle }] }),
  component: lazyRouteComponent(
    () => import('@/features/admin-workspace/components/admin-clients-page'),
    'AdminClientsPage',
  ),
});

const adminClientDetailRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: 'clients/$clientId',
  staticData: { title: 'Client', documentTitle: documentTitleFor('Client'), description: clientsMeta.description },
  head: () => ({ meta: [{ title: documentTitleFor('Client') }] }),
  component: lazyRouteComponent(
    () => import('@/features/admin-workspace/components/admin-clients-page'),
    'AdminClientDetailPage',
  ),
});

const assignmentsMeta = getRouteMeta('/admin/assignments');
const adminAssignmentsRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: 'assignments',
  validateSearch: validateAdminPeopleSearch,
  staticData: assignmentsMeta,
  head: () => ({ meta: [{ title: assignmentsMeta.documentTitle }] }),
  component: lazyRouteComponent(
    () => import('@/features/admin-workspace/components/admin-assignments-page'),
    'AdminAssignmentsPage',
  ),
});

const exercisesMeta = getRouteMeta('/admin/exercises');
const adminExercisesRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: 'exercises',
  validateSearch: validateAdminExercisesSearch,
  staticData: exercisesMeta,
  head: () => ({ meta: [{ title: exercisesMeta.documentTitle }] }),
  component: lazyRouteComponent(
    () => import('@/features/admin-workspace/components/admin-exercises-page'),
    'AdminExercisesPage',
  ),
});

const adminExerciseDetailRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: 'exercises/$exerciseId',
  staticData: { title: 'Exercise', documentTitle: documentTitleFor('Exercise'), description: exercisesMeta.description },
  head: () => ({ meta: [{ title: documentTitleFor('Exercise') }] }),
  component: lazyRouteComponent(
    () => import('@/features/admin-workspace/components/admin-exercises-page'),
    'AdminExerciseDetailPage',
  ),
});

const foodsMeta = getRouteMeta('/admin/foods');
const adminFoodsRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: 'foods',
  validateSearch: validateAdminCatalogSearch,
  staticData: foodsMeta,
  head: () => ({ meta: [{ title: foodsMeta.documentTitle }] }),
  component: lazyRouteComponent(
    () => import('@/features/admin-workspace/components/admin-foods-page'),
    'AdminFoodsPage',
  ),
});

const adminFoodDetailRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: 'foods/$foodId',
  staticData: { title: 'Food', documentTitle: documentTitleFor('Food'), description: foodsMeta.description },
  head: () => ({ meta: [{ title: documentTitleFor('Food') }] }),
  component: lazyRouteComponent(
    () => import('@/features/admin-workspace/components/admin-foods-page'),
    'AdminFoodDetailPage',
  ),
});

const notificationsMeta = getRouteMeta('/admin/notifications');
const adminNotificationsRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: 'notifications',
  staticData: notificationsMeta,
  head: () => ({ meta: [{ title: notificationsMeta.documentTitle }] }),
  component: RoutePlaceholderPage,
});

export const adminRouteTree = adminRoute.addChildren([
  adminIndexRoute,
  adminDashboardRoute,
  adminTrainersRoute,
  adminTrainerDetailRoute,
  adminClientsRoute,
  adminClientDetailRoute,
  adminAssignmentsRoute,
  adminExercisesRoute,
  adminExerciseDetailRoute,
  adminFoodsRoute,
  adminFoodDetailRoute,
  adminNotificationsRoute,
]);
