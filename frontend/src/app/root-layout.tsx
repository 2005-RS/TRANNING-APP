import { useEffect } from 'react';
import { HeadContent, Outlet, useRouterState } from '@tanstack/react-router';
import { AppBootScreen } from '@/features/auth/components/app-boot-screen';
import { SessionRestoreScreen } from '@/features/auth/components/session-restore-screen';
import { useAuthSession } from '@/features/auth/hooks/use-auth-session';
import { isAuthUnresolved } from '@/features/auth/lib/auth-session-context';
import { SkipLink } from '@/app/shells/skip-link';
import { isPublicSitePath } from '@/features/public-site/lib/public-paths';

function RouterHrefProbe() {
  const href = useRouterState({
    select: (state) => `${state.location.pathname}${state.location.searchStr}`,
  });
  return (
    <span data-testid="router-href" className="sr-only">
      {href}
    </span>
  );
}

function preloadClientRoute(pathname: string) {
  void import('@/app/shells/client-app-shell');
  if (pathname.includes('/workout/')) {
    void import('@/features/workout-session/components/workout-focus-page');
    return;
  }
  if (pathname.includes('/progress/exercises/')) {
    void import('@/features/client-progress/components/exercise-progress-page');
    return;
  }
  if (pathname.startsWith('/client/check-ins/') && pathname !== '/client/check-ins') {
    void import('@/features/client-check-ins/components/client-check-in-detail-page');
    return;
  }
  if (pathname.startsWith('/client/training')) {
    void import('@/features/workout-session/components/training-hub-page');
    return;
  }
  if (pathname.startsWith('/client/progress')) {
    void import('@/features/client-progress/components/client-progress-page');
    return;
  }
  if (pathname.startsWith('/client/nutrition')) {
    void import('@/features/client-nutrition/components/client-nutrition-page');
    return;
  }
  if (pathname.startsWith('/client/body')) {
    void import('@/features/client-body/components/client-body-page');
    return;
  }
  if (pathname.startsWith('/client/check-ins')) {
    void import('@/features/client-check-ins/components/client-check-ins-page');
    return;
  }
  void import('@/features/client-dashboard/components/client-dashboard-page');
}

export function RootLayout() {
  const { status } = useAuthSession();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  // Public marketing pages never read private data, so they render during session restore.
  const publicPage = isPublicSitePath(pathname);
  const unresolved = isAuthUnresolved(status) && !publicPage;
  const bootstrapping = status === 'BOOTSTRAPPING';
  const restoreFailed = status === 'RESTORE_FAILED' && !publicPage;

  useEffect(() => {
    if (!bootstrapping || !pathname.startsWith('/client')) {
      return;
    }
    preloadClientRoute(pathname);
  }, [bootstrapping, pathname]);

  return (
    <>
      <SkipLink />
      <HeadContent />
      {import.meta.env.MODE === 'test' ? <RouterHrefProbe /> : null}
      {bootstrapping && !publicPage ? <AppBootScreen /> : null}
      {restoreFailed ? <SessionRestoreScreen /> : null}
      <div hidden={unresolved} className={unresolved ? undefined : 'contents'}>
        <Outlet />
      </div>
    </>
  );
}
