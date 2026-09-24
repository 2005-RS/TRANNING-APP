import { lazyRouteComponent } from '@tanstack/react-router';

export const RoutePlaceholderPage = lazyRouteComponent(
  () => import('@/features/navigation/route-placeholder-page'),
  'RoutePlaceholderPage',
);
