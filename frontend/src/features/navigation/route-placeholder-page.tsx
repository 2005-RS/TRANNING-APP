import { useRouterState } from '@tanstack/react-router';
import { PageContainer, PageDescription, PageHeader, PageTitle } from '@/shared/ui/page';
import { useNavigationCopy } from '@/features/navigation/copy';
import { useCurrentRouteMeta } from '@/features/navigation/use-current-route-meta';

export function RoutePlaceholderPage() {
  const navigationCopy = useNavigationCopy();
  const meta = useCurrentRouteMeta();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const density = pathname.startsWith('/client') ? 'client' : 'productivity';

  return (
    <PageContainer density={density}>
      <PageHeader>
        <div className="space-y-2">
          {density === 'client' ? null : (
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {navigationCopy.comingSoon}
            </p>
          )}
          <PageTitle>{meta.title}</PageTitle>
          <PageDescription>{meta.description}</PageDescription>
        </div>
      </PageHeader>
    </PageContainer>
  );
}
