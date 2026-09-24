import { useAuthCopy } from '@/features/auth/copy';
import { BrandMark } from '@/features/auth/components/brand-mark';
import { useAuthSession } from '@/features/auth/hooks/use-auth-session';
import { Button } from '@/shared/ui/button';

export function SessionRestoreScreen() {
  const authCopy = useAuthCopy();
  const { retryRestore, continueToSignIn } = useAuthSession();

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background px-6">
      <div className="flex w-full max-w-sm flex-col items-center gap-6 text-center">
        <BrandMark />
        <div className="space-y-2">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            {authCopy.restore.title}
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {authCopy.restore.body}
          </p>
        </div>
        <div className="flex w-full flex-col gap-3">
          <Button
            className="min-h-12 w-full"
            onClick={() => {
              void retryRestore();
            }}
          >
            {authCopy.restore.retry}
          </Button>
          <Button
            variant="outline"
            className="min-h-12 w-full"
            onClick={continueToSignIn}
          >
            {authCopy.restore.goToSignIn}
          </Button>
        </div>
      </div>
    </div>
  );
}
