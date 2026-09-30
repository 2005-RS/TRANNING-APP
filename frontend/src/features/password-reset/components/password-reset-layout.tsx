import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { CircleAlert } from 'lucide-react';
import { BrandMark } from '@/features/auth/components/brand-mark';
import { LoginHero } from '@/features/auth/components/login-hero';
import { ThemeCycleButton } from '@/features/auth/components/theme-cycle-button';
import { useAuthCopy } from '@/features/auth/copy';
import { usePasswordResetCopy } from '@/features/password-reset/copy';
import { LanguageSwitcher } from '@/i18n/language-switcher';

type PasswordResetLayoutProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export function PasswordResetLayout({ title, subtitle, children }: PasswordResetLayoutProps) {
  const authCopy = useAuthCopy();
  const copy = usePasswordResetCopy();
  return (
    <div className="grid min-h-svh bg-background lg:grid-cols-[minmax(0,1fr)_minmax(22rem,32rem)]">
      <LoginHero />
      <main
        id="main-content"
        className="flex min-h-svh flex-col bg-background px-5 py-6 sm:px-8 lg:border-l lg:border-border lg:px-10 lg:py-10"
      >
        <div className="mb-8 flex items-center justify-between gap-3 lg:mb-0">
          <Link to="/" className="rounded-md lg:hidden" aria-label={authCopy.backToSite}>
            <BrandMark />
          </Link>
          <div className="ml-auto flex items-center gap-1">
            <LanguageSwitcher />
            <ThemeCycleButton />
          </div>
        </div>
        <div className="flex flex-1 flex-col justify-center">
          <div className="mx-auto w-full max-w-sm space-y-8">
            <header className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
              {subtitle ? (
                <p className="text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
              ) : null}
            </header>
            {children}
            <p className="text-sm">
              <Link
                to="/login"
                className="rounded-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {copy.backToSignIn}
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export function FieldErrorText({ id, message }: { id: string; message: string }) {
  return (
    <p id={id} className="flex items-center gap-1.5 text-sm text-foreground">
      <CircleAlert className="size-3.5 text-danger" aria-hidden />
      {message}
    </p>
  );
}
