import { createRoute } from '@tanstack/react-router';
import { LoginRouteScreen } from '@/features/auth/components/login-route-screen';
import { authCopy } from '@/features/auth/copy';
import { documentTitleFor } from '@/features/navigation/copy';
import { sanitizeInternalPath } from '@/features/auth/lib/redirect';
import { rootRoute } from '@/routes/__root';

export const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => {
    const redirect = sanitizeInternalPath(search.redirect);
    return redirect ? { redirect } : {};
  },
  head: () => ({
    meta: [{ title: documentTitleFor(authCopy.login.title) }],
  }),
  component: LoginRouteScreen,
});
