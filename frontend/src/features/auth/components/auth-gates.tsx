import { useLayoutEffect } from 'react';
import { Navigate, useRouter, useRouterState } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { useAuthSession } from '@/features/auth/hooks/use-auth-session';
import { homeForRole } from '@/features/auth/lib/role-home';
import { isAuthUnresolved } from '@/features/auth/lib/auth-session-context';
import { resolveAuthenticatedDestination, sanitizeInternalPath } from '@/features/auth/lib/redirect';
import type { AuthUserResponseDto } from '@/generated/models';

export function RedirectTo({ href }: { href: string }) {
  const router = useRouter();

  useLayoutEffect(() => {
    if (router.state.location.pathname === href) {
      return;
    }
    void router.history.replace(href);
  }, [href, router]);

  return null;
}

export function RequireAuth({
  role,
  children,
}: {
  role?: AuthUserResponseDto['role'];
  children: ReactNode;
}) {
  const { status, user } = useAuthSession();
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  if (isAuthUnresolved(status)) {
    return null;
  }

  if (status === 'UNAUTHENTICATED' || !user) {
    if (pathname === '/login' || pathname.startsWith('/login/')) {
      return null;
    }

    const redirect = sanitizeInternalPath(pathname);
    return (
      <Navigate
        to="/login"
        search={redirect ? { redirect } : {}}
        replace
      />
    );
  }

  if (role && user.role !== role) {
    return <Navigate to={homeForRole(user.role)} replace />;
  }

  return children;
}

export function RedirectIfAuthenticated({
  children,
  redirect,
}: {
  children: ReactNode;
  redirect?: string;
}) {
  const { status, user } = useAuthSession();

  if (status === 'BOOTSTRAPPING') {
    return children;
  }

  if (status === 'RESTORE_FAILED') {
    return null;
  }

  if (status === 'AUTHENTICATED' && user) {
    return (
      <RedirectTo href={resolveAuthenticatedDestination(user.role, redirect)} />
    );
  }

  return children;
}

export function HomeRedirect() {
  const { status, user } = useAuthSession();

  if (isAuthUnresolved(status)) {
    return null;
  }

  if (status === 'AUTHENTICATED' && user) {
    return <Navigate to={homeForRole(user.role)} replace />;
  }

  return <Navigate to="/login" replace />;
}
