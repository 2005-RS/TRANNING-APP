import { createRoute, lazyRouteComponent } from '@tanstack/react-router';
import { PublicSiteLayout } from '@/features/public-site/components/public-site-layout';
import { publicSiteCopy } from '@/features/public-site/copy';
import { documentTitleFor } from '@/features/navigation/copy';
import { rootRoute } from '@/routes/__root';

export const publicSiteRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'public-site',
  component: PublicSiteLayout,
});

const publicHomeRoute = createRoute({
  getParentRoute: () => publicSiteRoute,
  path: '/',
  head: () => ({ meta: [{ title: documentTitleFor(publicSiteCopy.home.title) }] }),
  component: lazyRouteComponent(
    () => import('@/features/public-site/components/public-home-page'),
    'PublicHomePage',
  ),
});

const publicPlatformRoute = createRoute({
  getParentRoute: () => publicSiteRoute,
  path: '/platform',
  head: () => ({ meta: [{ title: documentTitleFor(publicSiteCopy.platform.title) }] }),
  component: lazyRouteComponent(
    () => import('@/features/public-site/components/public-platform-page'),
    'PublicPlatformPage',
  ),
});

const publicTrainingRoute = createRoute({
  getParentRoute: () => publicSiteRoute,
  path: '/training',
  head: () => ({ meta: [{ title: documentTitleFor(publicSiteCopy.training.title) }] }),
  component: lazyRouteComponent(
    () => import('@/features/public-site/components/public-training-page'),
    'PublicTrainingPage',
  ),
});

const publicProgressRoute = createRoute({
  getParentRoute: () => publicSiteRoute,
  path: '/progress',
  head: () => ({ meta: [{ title: documentTitleFor(publicSiteCopy.progress.title) }] }),
  component: lazyRouteComponent(
    () => import('@/features/public-site/components/public-progress-page'),
    'PublicProgressPage',
  ),
});

const publicAboutRoute = createRoute({
  getParentRoute: () => publicSiteRoute,
  path: '/about',
  head: () => ({ meta: [{ title: documentTitleFor(publicSiteCopy.about.title) }] }),
  component: lazyRouteComponent(
    () => import('@/features/public-site/components/public-about-page'),
    'PublicAboutPage',
  ),
});

export const publicSiteRouteTree = publicSiteRoute.addChildren([
  publicHomeRoute,
  publicPlatformRoute,
  publicTrainingRoute,
  publicProgressRoute,
  publicAboutRoute,
]);
