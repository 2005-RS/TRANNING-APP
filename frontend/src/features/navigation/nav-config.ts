import type { LucideIcon } from 'lucide-react';
import {
  Apple,
  Bell,
  ClipboardCheck,
  Dumbbell,
  Ellipsis,
  Home,
  LayoutDashboard,
  Link2,
  PersonStanding,
  Ruler,
  TrendingUp,
  UserCog,
  Users,
  Utensils,
} from 'lucide-react';
import {
  adminCopy,
  clientCopy,
  trainerCopy,
} from '@/features/navigation/copy';
import {
  getRouteMeta,
  type AppPath,
  type RouteMeta,
} from '@/features/navigation/route-meta';

export type { AppPath, RouteMeta };
export {
  getAllRouteMeta,
  getRouteMeta,
  isPathActive,
  isClientWorkoutFocusPath,
  isAppPath,
} from '@/features/navigation/route-meta';

export type NavItem = {
  to: AppPath;
  label: string;
  icon: LucideIcon;
  meta: RouteMeta;
};

const CLIENT_MORE_PATHS = ['/client/body', '/client/check-ins', '/client/notifications'] as const;

export function getClientPrimaryNav(): NavItem[] {
  return [
    {
      to: '/client/dashboard',
      label: clientCopy.home.label,
      icon: Home,
      meta: getRouteMeta('/client/dashboard'),
    },
    {
      to: '/client/training',
      label: clientCopy.training.label,
      icon: Dumbbell,
      meta: getRouteMeta('/client/training'),
    },
    {
      to: '/client/progress',
      label: clientCopy.progress.label,
      icon: TrendingUp,
      meta: getRouteMeta('/client/progress'),
    },
    {
      to: '/client/nutrition',
      label: clientCopy.nutrition.label,
      icon: Utensils,
      meta: getRouteMeta('/client/nutrition'),
    },
  ];
}

export function getClientMoreNav(): NavItem[] {
  return [
    {
      to: '/client/body',
      label: clientCopy.body.label,
      icon: Ruler,
      meta: getRouteMeta('/client/body'),
    },
    {
      to: '/client/check-ins',
      label: clientCopy.checkIns.label,
      icon: ClipboardCheck,
      meta: getRouteMeta('/client/check-ins'),
    },
    {
      to: '/client/notifications',
      label: clientCopy.notifications.label,
      icon: Bell,
      meta: getRouteMeta('/client/notifications'),
    },
  ];
}

export function getClientMoreTab() {
  return {
    label: clientCopy.more.label,
    icon: Ellipsis,
  };
}

export function getTrainerNav(): NavItem[] {
  return [
    {
      to: '/trainer/dashboard',
      label: trainerCopy.dashboard.label,
      icon: LayoutDashboard,
      meta: getRouteMeta('/trainer/dashboard'),
    },
    {
      to: '/trainer/clients',
      label: trainerCopy.clients.label,
      icon: Users,
      meta: getRouteMeta('/trainer/clients'),
    },
    {
      to: '/trainer/check-ins',
      label: trainerCopy.checkIns.label,
      icon: ClipboardCheck,
      meta: getRouteMeta('/trainer/check-ins'),
    },
    {
      to: '/trainer/training',
      label: trainerCopy.training.label,
      icon: Dumbbell,
      meta: getRouteMeta('/trainer/training'),
    },
    {
      to: '/trainer/nutrition',
      label: trainerCopy.nutrition.label,
      icon: Utensils,
      meta: getRouteMeta('/trainer/nutrition'),
    },
    {
      to: '/trainer/exercises',
      label: trainerCopy.exercises.label,
      icon: PersonStanding,
      meta: getRouteMeta('/trainer/exercises'),
    },
    {
      to: '/trainer/notifications',
      label: trainerCopy.notifications.label,
      icon: Bell,
      meta: getRouteMeta('/trainer/notifications'),
    },
  ];
}

export function getAdminNav(): NavItem[] {
  return [
    {
      to: '/admin/dashboard',
      label: adminCopy.dashboard.label,
      icon: LayoutDashboard,
      meta: getRouteMeta('/admin/dashboard'),
    },
    {
      to: '/admin/trainers',
      label: adminCopy.trainers.label,
      icon: UserCog,
      meta: getRouteMeta('/admin/trainers'),
    },
    {
      to: '/admin/clients',
      label: adminCopy.clients.label,
      icon: Users,
      meta: getRouteMeta('/admin/clients'),
    },
    {
      to: '/admin/assignments',
      label: adminCopy.assignments.label,
      icon: Link2,
      meta: getRouteMeta('/admin/assignments'),
    },
    {
      to: '/admin/exercises',
      label: adminCopy.exercises.label,
      icon: PersonStanding,
      meta: getRouteMeta('/admin/exercises'),
    },
    {
      to: '/admin/foods',
      label: adminCopy.foods.label,
      icon: Apple,
      meta: getRouteMeta('/admin/foods'),
    },
    {
      to: '/admin/notifications',
      label: adminCopy.notifications.label,
      icon: Bell,
      meta: getRouteMeta('/admin/notifications'),
    },
  ];
}

export function isClientMoreActive(pathname: string): boolean {
  return CLIENT_MORE_PATHS.some((to) => pathname === to || pathname.startsWith(`${to}/`));
}
