import {
  adminCopy,
  clientCopy,
  documentTitleFor,
  trainerCopy,
} from '@/features/navigation/copy';

export type AppPath =
  | '/client/dashboard'
  | '/client/training'
  | '/client/progress'
  | '/client/body'
  | '/client/nutrition'
  | '/client/check-ins'
  | '/client/notifications'
  | '/trainer/dashboard'
  | '/trainer/clients'
  | '/trainer/check-ins'
  | '/trainer/training'
  | '/trainer/nutrition'
  | '/trainer/exercises'
  | '/trainer/notifications'
  | '/admin/dashboard'
  | '/admin/trainers'
  | '/admin/clients'
  | '/admin/assignments'
  | '/admin/exercises'
  | '/admin/foods'
  | '/admin/notifications';

export type RouteMeta = {
  title: string;
  documentTitle: string;
  description: string;
};

const APP_PATHS = new Set<string>([
  '/client/dashboard',
  '/client/training',
  '/client/progress',
  '/client/body',
  '/client/nutrition',
  '/client/check-ins',
  '/client/notifications',
  '/trainer/dashboard',
  '/trainer/clients',
  '/trainer/check-ins',
  '/trainer/training',
  '/trainer/nutrition',
  '/trainer/exercises',
  '/trainer/notifications',
  '/admin/dashboard',
  '/admin/trainers',
  '/admin/clients',
  '/admin/assignments',
  '/admin/exercises',
  '/admin/foods',
  '/admin/notifications',
]);

function meta(title: string, description: string): RouteMeta {
  return {
    title,
    documentTitle: documentTitleFor(title),
    description,
  };
}

export function getAllRouteMeta(): Record<AppPath, RouteMeta> {
  return {
    '/client/dashboard': meta(clientCopy.home.title, clientCopy.home.description),
    '/client/training': meta(clientCopy.training.title, clientCopy.training.description),
    '/client/progress': meta(clientCopy.progress.title, clientCopy.progress.description),
    '/client/nutrition': meta(clientCopy.nutrition.title, clientCopy.nutrition.description),
    '/client/body': meta(clientCopy.body.title, clientCopy.body.description),
    '/client/check-ins': meta(clientCopy.checkIns.title, clientCopy.checkIns.description),
    '/client/notifications': meta(
      clientCopy.notifications.title,
      clientCopy.notifications.description,
    ),
    '/trainer/dashboard': meta(trainerCopy.dashboard.title, trainerCopy.dashboard.description),
    '/trainer/clients': meta(trainerCopy.clients.title, trainerCopy.clients.description),
    '/trainer/check-ins': meta(trainerCopy.checkIns.title, trainerCopy.checkIns.description),
    '/trainer/training': meta(trainerCopy.training.title, trainerCopy.training.description),
    '/trainer/nutrition': meta(trainerCopy.nutrition.title, trainerCopy.nutrition.description),
    '/trainer/exercises': meta(trainerCopy.exercises.title, trainerCopy.exercises.description),
    '/trainer/notifications': meta(
      trainerCopy.notifications.title,
      trainerCopy.notifications.description,
    ),
    '/admin/dashboard': meta(adminCopy.dashboard.title, adminCopy.dashboard.description),
    '/admin/trainers': meta(adminCopy.trainers.title, adminCopy.trainers.description),
    '/admin/clients': meta(adminCopy.clients.title, adminCopy.clients.description),
    '/admin/assignments': meta(adminCopy.assignments.title, adminCopy.assignments.description),
    '/admin/exercises': meta(adminCopy.exercises.title, adminCopy.exercises.description),
    '/admin/foods': meta(adminCopy.foods.title, adminCopy.foods.description),
    '/admin/notifications': meta(
      adminCopy.notifications.title,
      adminCopy.notifications.description,
    ),
  };
}

export function getRouteMeta(path: AppPath): RouteMeta {
  return getAllRouteMeta()[path];
}

export function isAppPath(value: string): value is AppPath {
  return APP_PATHS.has(value);
}

export function isPathActive(pathname: string, to: AppPath): boolean {
  if (to === '/client/training') {
    return pathname === '/client/training' || pathname.startsWith('/client/workout/');
  }
  return pathname === to || pathname.startsWith(`${to}/`);
}

export function isClientWorkoutFocusPath(pathname: string): boolean {
  return pathname.startsWith('/client/workout/');
}
