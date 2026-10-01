import { Link } from '@tanstack/react-router';
import { useAuthCopy } from '@/features/auth/copy';
import { BrandMark } from '@/features/auth/components/brand-mark';
import { LoginForm } from '@/features/auth/components/login-form';
import { LoginHero } from '@/features/auth/components/login-hero';
import { LanguageSwitcher } from '@/i18n/language-switcher';
import { ForgotPasswordLink } from '@/features/password-reset/components/forgot-password-link';
import { useAuthSession } from '@/features/auth/hooks/use-auth-session';
import type { LoginFormValues } from '@/features/auth/schemas/login-schema';

/**
 * Sign-in screen. It is the doorway from the public site, so it wears the same
 * black + orange identity (`.landing`); the workspaces keep the user's theme.
 */
export function LoginPage() {
  const authCopy = useAuthCopy();
  const { login } = useAuthSession();

  async function handleLogin(values: LoginFormValues) {
    await login(values);
  }

  return (
    <div className="landing grid min-h-svh bg-background lg:grid-cols-[minmax(0,1fr)_minmax(22rem,32rem)]">
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
          </div>
        </div>
        <div className="flex flex-1 flex-col justify-center">
          <div className="mx-auto w-full max-w-sm space-y-8">
            <header className="space-y-2">
              <h1 className="landing-display text-4xl text-foreground">
                {authCopy.login.title}
              </h1>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {authCopy.login.subtitle}
              </p>
            </header>
            <LoginForm onLogin={handleLogin} />
            <ForgotPasswordLink />
          </div>
        </div>
      </main>
    </div>
  );
}
