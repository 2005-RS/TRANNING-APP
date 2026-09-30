import { lazy, Suspense } from 'react';
import { RedirectIfAuthenticated } from '@/features/auth/components/auth-gates';

const ForgotPasswordPage = lazy(() =>
  import('@/features/password-reset/components/forgot-password-page').then((module) => ({
    default: module.ForgotPasswordPage,
  })),
);

const ResetPasswordPage = lazy(() =>
  import('@/features/password-reset/components/reset-password-page').then((module) => ({
    default: module.ResetPasswordPage,
  })),
);

const fallback = <div className="min-h-svh bg-background" />;

export function ForgotPasswordRouteScreen() {
  return (
    <RedirectIfAuthenticated>
      <Suspense fallback={fallback}>
        <ForgotPasswordPage />
      </Suspense>
    </RedirectIfAuthenticated>
  );
}

/** Not gated on the session: the link must work even if this browser is still signed in. */
export function ResetPasswordRouteScreen() {
  return (
    <Suspense fallback={fallback}>
      <ResetPasswordPage />
    </Suspense>
  );
}
