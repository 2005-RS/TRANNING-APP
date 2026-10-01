import { lazy, Suspense } from 'react';
import { useSearch } from '@tanstack/react-router';
import { RedirectIfAuthenticated } from '@/features/auth/components/auth-gates';
import { TrainingAssistant } from '@/features/training-assistant/components/training-assistant';

const LoginPage = lazy(() =>
  import('@/features/auth/components/login-page').then((module) => ({
    default: module.LoginPage,
  })),
);

export function LoginRouteScreen() {
  const { redirect } = useSearch({ from: '/login' });
  return (
    <RedirectIfAuthenticated redirect={redirect}>
      {/* Same black + orange scope as the public site, assistant included. */}
      <div className="landing contents">
        <Suspense fallback={<div className="min-h-svh bg-background" />}>
          <LoginPage />
        </Suspense>
        <TrainingAssistant placement="public" />
      </div>
    </RedirectIfAuthenticated>
  );
}
