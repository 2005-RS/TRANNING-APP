import { createRoute } from '@tanstack/react-router';
import { RegisterRouteScreen } from '@/features/auth/components/register-route-screen';
import { authCopy } from '@/features/auth/copy';
import { documentTitleFor } from '@/features/navigation/copy';
import { rootRoute } from '@/routes/__root';

export const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/register',
  head: () => ({
    meta: [{ title: documentTitleFor(authCopy.register.title) }],
  }),
  component: RegisterRouteScreen,
});
