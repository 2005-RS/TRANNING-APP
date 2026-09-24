import { useMemo } from 'react';
import { useRouterState } from '@tanstack/react-router';
import { useNavigationCopy } from '@/features/navigation/copy';
import { getRouteMeta, isAppPath } from '@/features/navigation/route-meta';
import { useAuthCopy } from '@/features/auth/copy';
import { useAdminWorkspaceCopy } from '@/features/admin-workspace/copy';

export function useCurrentRouteMeta() {
  const navigationCopy = useNavigationCopy();
  const authCopy = useAuthCopy();
  const adminCopy = useAdminWorkspaceCopy();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const matches = useRouterState({ select: (state) => state.matches });

  return useMemo(() => {
    if (isAppPath(pathname)) {
      return getRouteMeta(pathname);
    }
    if (pathname.startsWith('/admin/trainers/')) {
      return {
        title: adminCopy.trainers.detailTitle,
        documentTitle: `${adminCopy.trainers.detailTitle} · ${authCopy.productName}`,
        description: adminCopy.trainers.description,
      };
    }
    if (pathname.startsWith('/admin/clients/')) {
      return {
        title: adminCopy.clients.detailTitle,
        documentTitle: `${adminCopy.clients.detailTitle} · ${authCopy.productName}`,
        description: adminCopy.clients.description,
      };
    }
    if (pathname.startsWith('/admin/exercises/')) {
      return {
        title: adminCopy.exercises.detailTitle,
        documentTitle: `${adminCopy.exercises.detailTitle} · ${authCopy.productName}`,
        description: adminCopy.exercises.description,
      };
    }
    if (pathname.startsWith('/admin/foods/')) {
      return {
        title: adminCopy.foods.detailTitle,
        documentTitle: `${adminCopy.foods.detailTitle} · ${authCopy.productName}`,
        description: adminCopy.foods.description,
      };
    }
    const match = [...matches].reverse().find((item) => item.staticData?.title);
    if (match?.staticData?.title) {
      return {
        title: match.staticData.title,
        documentTitle: match.staticData.documentTitle ?? match.staticData.title,
        description: match.staticData.description ?? navigationCopy.placeholderBody,
      };
    }
    return {
      title: navigationCopy.notFoundTitle,
      documentTitle: `${navigationCopy.notFoundTitle} · ${authCopy.productName}`,
      description: navigationCopy.notFoundBody,
    };
  }, [adminCopy, authCopy.productName, matches, navigationCopy, pathname]);
}
