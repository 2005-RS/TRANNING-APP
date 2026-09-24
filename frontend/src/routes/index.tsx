import { createRoute } from '@tanstack/react-router';
import { HomeRedirect } from '@/features/auth/components/auth-gates';
import { rootRoute } from '@/routes/__root';

export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomeRedirect,
});
