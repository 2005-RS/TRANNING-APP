import { Link } from '@tanstack/react-router';
import { usePasswordResetCopy } from '@/features/password-reset/copy';

export function ForgotPasswordLink() {
  const copy = usePasswordResetCopy();
  return (
    <p className="text-sm">
      <Link
        to="/forgot-password"
        className="rounded-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {copy.forgotLink}
      </Link>
    </p>
  );
}
