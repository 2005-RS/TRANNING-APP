import { createRoute } from '@tanstack/react-router';
import { ResetPasswordRouteScreen } from '@/features/password-reset/components/password-reset-route-screens';
import { passwordResetCopy } from '@/features/password-reset/copy';
import { documentTitleFor } from '@/features/navigation/copy';
import { rootRoute } from '@/routes/__root';

export const resetPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/reset-password',
  head: () => ({
    meta: [{ title: documentTitleFor(passwordResetCopy.reset.title) }],
  }),
  component: ResetPasswordRouteScreen,
});
