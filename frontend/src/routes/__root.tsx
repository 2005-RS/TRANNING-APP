import { createRootRouteWithContext } from '@tanstack/react-router';
import { RootLayout } from '@/app/root-layout';
import type { AppRouterContext } from '@/app/router-context';
import { NotFoundPage } from '@/app/shells/not-found-page';
import { RouteErrorPage } from '@/app/shells/route-error-page';

export const rootRoute = createRootRouteWithContext<AppRouterContext>()({
  component: RootLayout,
  notFoundComponent: NotFoundPage,
  errorComponent: RouteErrorPage,
});
