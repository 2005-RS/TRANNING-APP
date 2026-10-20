import { lazy, Suspense, useState } from 'react';
import { RedirectIfAuthenticated } from '@/features/auth/components/auth-gates';
import { TrainingAssistant } from '@/features/training-assistant/components/training-assistant';

const RegisterPage = lazy(() =>
  import('@/features/auth/components/register-page').then((module) => ({
    default: module.RegisterPage,
  })),
);

export function RegisterRouteScreen() {
  // A new account lands on the welcome flow. Set before register() resolves so the
  // authenticated gate redirects there instead of racing a manual navigate to Home.
  const [destination, setDestination] = useState<string | undefined>(undefined);

  return (
    <RedirectIfAuthenticated redirect={destination}>
      <div className="landing contents">
        <Suspense fallback={<div className="min-h-svh bg-background" />}>
          <RegisterPage onDestinationChange={setDestination} />
        </Suspense>
        <TrainingAssistant placement="public" />
      </div>
    </RedirectIfAuthenticated>
  );
}
