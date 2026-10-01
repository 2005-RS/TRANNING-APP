import { createRoute, lazyRouteComponent } from '@tanstack/react-router';
import { PublicSiteLayout } from '@/features/public-site/components/public-site-layout';
import { publicSiteCopy } from '@/features/public-site/copy';
import { publicPageHead } from '@/features/public-site/lib/public-head';
import { rootRoute } from '@/routes/__root';

export const publicSiteRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'public-site',
  component: PublicSiteLayout,
});

const publicHomeRoute = createRoute({
  getParentRoute: () => publicSiteRoute,
  path: '/',
  head: () => publicPageHead(publicSiteCopy.home.title, publicSiteCopy.landing.body),
  component: lazyRouteComponent(
    () => import('@/features/public-site/components/public-home-page'),
    'PublicHomePage',
  ),
});

const publicPlatformRoute = createRoute({
  getParentRoute: () => publicSiteRoute,
  path: '/platform',
  head: () => publicPageHead(publicSiteCopy.platform.title, publicSiteCopy.platform.body),
  component: lazyRouteComponent(
    () => import('@/features/public-site/components/public-platform-page'),
    'PublicPlatformPage',
  ),
});

const publicTrainingRoute = createRoute({
  getParentRoute: () => publicSiteRoute,
  path: '/training',
  head: () => publicPageHead(publicSiteCopy.training.title, publicSiteCopy.training.body),
  component: lazyRouteComponent(
    () => import('@/features/public-site/components/public-training-page'),
    'PublicTrainingPage',
  ),
});

const publicProgressRoute = createRoute({
  getParentRoute: () => publicSiteRoute,
  path: '/progress',
  head: () => publicPageHead(publicSiteCopy.progress.title, publicSiteCopy.progress.body),
  component: lazyRouteComponent(
    () => import('@/features/public-site/components/public-progress-page'),
    'PublicProgressPage',
  ),
});

const publicAboutRoute = createRoute({
  getParentRoute: () => publicSiteRoute,
  path: '/about',
  head: () => publicPageHead(publicSiteCopy.about.title, publicSiteCopy.about.body),
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
