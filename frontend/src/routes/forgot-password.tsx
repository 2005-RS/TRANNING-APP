import { createRoute } from '@tanstack/react-router';
import { ForgotPasswordRouteScreen } from '@/features/password-reset/components/password-reset-route-screens';
import { passwordResetCopy } from '@/features/password-reset/copy';
import { documentTitleFor } from '@/features/navigation/copy';
import { rootRoute } from '@/routes/__root';

export const forgotPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/forgot-password',
  head: () => ({
    meta: [{ title: documentTitleFor(passwordResetCopy.forgot.title) }],
  }),
  component: ForgotPasswordRouteScreen,
});
