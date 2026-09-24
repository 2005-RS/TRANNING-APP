import { authCopy } from '@/features/auth/copy';
import { BrandMark } from '@/features/auth/components/brand-mark';

export function AppBootScreen() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background px-6">
      <div className="flex w-full max-w-xs flex-col items-center gap-6">
        <BrandMark />
        <div
          className="h-1 w-full overflow-hidden rounded-full bg-muted"
          role="status"
          aria-live="polite"
          aria-label={authCopy.boot.status}
        >
          <div className="boot-bar h-full w-1/3 rounded-full bg-primary" />
        </div>
      </div>
    </div>
  );
}
