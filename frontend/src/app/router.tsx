import {
  createRouter,
  createBrowserHistory,
  type RouterHistory,
} from '@tanstack/react-router';
import { idleAuthContext } from '@/app/router-context';
import { rootRoute } from '@/routes/__root';
import { indexRoute } from '@/routes/index';
import { loginRoute } from '@/routes/login';
import { clientRouteTree } from '@/routes/client/route';
import { trainerRouteTree } from '@/routes/trainer/route';
import { adminRouteTree } from '@/routes/admin/route';
import { ContentSkeleton } from '@/shared/ui/page';

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  clientRouteTree,
  trainerRouteTree,
  adminRouteTree,
]);

export function createAppRouter(history?: RouterHistory) {
  return createRouter({
    routeTree,
    history: history ?? createBrowserHistory(),
    context: { auth: idleAuthContext },
    defaultPreload: 'intent',
    defaultPendingMs: 200,
    defaultPendingComponent: ContentSkeleton,
  });
}

export const router = createAppRouter();

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }

  interface StaticDataRouteOption {
    title?: string;
    documentTitle?: string;
    description?: string;
  }
}
