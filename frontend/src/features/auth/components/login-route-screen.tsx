import { lazy, Suspense } from 'react';
import { useSearch } from '@tanstack/react-router';
import { RedirectIfAuthenticated } from '@/features/auth/components/auth-gates';

const LoginPage = lazy(() =>
  import('@/features/auth/components/login-page').then((module) => ({
    default: module.LoginPage,
  })),
);

export function LoginRouteScreen() {
  const { redirect } = useSearch({ from: '/login' });
  return (
    <RedirectIfAuthenticated redirect={redirect}>
      <Suspense fallback={<div className="min-h-svh bg-background" />}>
        <LoginPage />
      </Suspense>
    </RedirectIfAuthenticated>
  );
}
