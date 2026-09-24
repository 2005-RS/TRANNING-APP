import { toast } from 'sonner';
import { useState } from 'react';
import { authCopy } from '@/features/auth/copy';
import { BrandMark } from '@/features/auth/components/brand-mark';
import { ThemeCycleButton } from '@/features/auth/components/theme-cycle-button';
import { useAuthSession } from '@/features/auth/hooks/use-auth-session';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Spinner } from '@/shared/ui/spinner';

export function AuthSessionPlaceholder() {
  const { user, logout, logoutAll } = useAuthSession();
  const [pending, setPending] = useState<'logout' | 'logoutAll' | null>(null);

  if (!user) {
    return null;
  }

  async function handleLogout() {
    setPending('logout');
    try {
      await logout();
      toast.success(authCopy.session.signedOut);
    } finally {
      setPending(null);
    }
  }

  async function handleLogoutAll() {
    setPending('logoutAll');
    try {
      await logoutAll();
      toast.success(authCopy.session.signedOutAll);
    } finally {
      setPending(null);
    }
  }

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-lg flex-col justify-center gap-8 px-5 py-12">
      <div className="flex items-center justify-between gap-3">
        <BrandMark compact />
        <ThemeCycleButton />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{authCopy.session.signedInAs}</CardTitle>
          <CardDescription>{authCopy.session.temporaryNote}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                {authCopy.session.signedInAs}
              </dt>
              <dd className="mt-1 font-medium text-foreground">
                {user.firstName} {user.lastName}
              </dd>
              <dd className="text-muted-foreground">{user.email}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                {authCopy.session.role}
              </dt>
              <dd className="mt-1 font-mono text-sm tracking-[0.12em] text-foreground">
                {user.role}
              </dd>
            </div>
          </dl>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              className="min-h-12 flex-1"
              onClick={() => void handleLogout()}
              disabled={pending !== null}
            >
              {pending === 'logout' ? (
                <>
                  <Spinner />
                  {authCopy.session.signingOut}
                </>
              ) : (
                authCopy.session.logout
              )}
            </Button>
            <Button
              variant="outline"
              className="min-h-12 flex-1"
              onClick={() => void handleLogoutAll()}
              disabled={pending !== null}
            >
              {pending === 'logoutAll' ? (
                <>
                  <Spinner />
                  {authCopy.session.signingOut}
                </>
              ) : (
                authCopy.session.logoutAll
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
