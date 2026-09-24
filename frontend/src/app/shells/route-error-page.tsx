import type { ErrorComponentProps } from '@tanstack/react-router';
import { BrandMark } from '@/features/auth/components/brand-mark';
import { useNavigationCopy } from '@/features/navigation/copy';
import { Button } from '@/shared/ui/button';
import { PageContainer, PageDescription, PageTitle } from '@/shared/ui/page';

export function RouteErrorPage({ error, reset }: ErrorComponentProps) {
  const navigationCopy = useNavigationCopy();
  if (import.meta.env.DEV) {
    console.error(error);
  }

  return (
    <main id="main-content" className="min-h-svh bg-background">
      <PageContainer className="flex min-h-svh flex-col justify-center py-16">
        <BrandMark />
        <div className="mt-10 max-w-md space-y-4">
          <PageTitle>{navigationCopy.routeErrorTitle}</PageTitle>
          <PageDescription>{navigationCopy.routeErrorBody}</PageDescription>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button onClick={reset}>{navigationCopy.retry}</Button>
            <Button variant="outline" onClick={() => window.location.reload()}>
              {navigationCopy.reload}
            </Button>
          </div>
        </div>
      </PageContainer>
    </main>
  );
}
