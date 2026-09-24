import { useEffect } from 'react';
import { Link } from '@tanstack/react-router';
import { useAuthSession } from '@/features/auth/hooks/use-auth-session';
import { homeForRole } from '@/features/auth/lib/role-home';
import { BrandMark } from '@/features/auth/components/brand-mark';
import { documentTitleFor, useNavigationCopy } from '@/features/navigation/copy';
import { cn } from '@/shared/lib/utils';
import { buttonVariants } from '@/shared/ui/button-variants';
import { PageContainer, PageDescription, PageTitle } from '@/shared/ui/page';

export function NotFoundPage() {
  const navigationCopy = useNavigationCopy();
  const { status, user } = useAuthSession();
  const authenticated = status === 'AUTHENTICATED' && user;

  useEffect(() => {
    document.title = documentTitleFor(navigationCopy.notFoundTitle);
  }, [navigationCopy.notFoundTitle]);

  return (
    <main id="main-content" className="min-h-svh bg-background">
      <PageContainer className="flex min-h-svh flex-col justify-center py-16">
        <BrandMark />
        <div className="mt-10 max-w-md space-y-4">
          <PageTitle>{navigationCopy.notFoundTitle}</PageTitle>
          <PageDescription>{navigationCopy.notFoundBody}</PageDescription>
          {authenticated && user ? (
            <Link
              to={homeForRole(user.role)}
              className={cn(buttonVariants(), 'mt-2 inline-flex')}
            >
              {navigationCopy.goToHome}
            </Link>
          ) : (
            <Link to="/login" className={cn(buttonVariants(), 'mt-2 inline-flex')}>
              {navigationCopy.goToLogin}
            </Link>
          )}
        </div>
      </PageContainer>
    </main>
  );
}
