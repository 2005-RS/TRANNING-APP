import { useAuthCopy } from '@/features/auth/copy';
import { BrandMark } from '@/features/auth/components/brand-mark';
import { LoginForm } from '@/features/auth/components/login-form';
import { LoginHero } from '@/features/auth/components/login-hero';
import { ThemeCycleButton } from '@/features/auth/components/theme-cycle-button';
import { LanguageSwitcher } from '@/i18n/language-switcher';
import { useAuthSession } from '@/features/auth/hooks/use-auth-session';
import type { LoginFormValues } from '@/features/auth/schemas/login-schema';

export function LoginPage() {
  const authCopy = useAuthCopy();
  const { login } = useAuthSession();

  async function handleLogin(values: LoginFormValues) {
    await login(values);
  }

  return (
    <div className="grid min-h-svh bg-background lg:grid-cols-[minmax(0,1fr)_minmax(22rem,32rem)]">
      <LoginHero />
      <main
        id="main-content"
        className="flex min-h-svh flex-col bg-background px-5 py-6 sm:px-8 lg:border-l lg:border-border lg:px-10 lg:py-10"
      >
        <div className="mb-8 flex items-center justify-between gap-3 lg:mb-0">
          <div className="lg:hidden">
            <BrandMark compact />
          </div>
          <div className="ml-auto flex items-center gap-1">
            <LanguageSwitcher />
            <ThemeCycleButton />
          </div>
        </div>
        <div className="flex flex-1 flex-col justify-center">
          <div className="mx-auto w-full max-w-sm space-y-8">
            <header className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground lg:hidden">
                {authCopy.login.mobileEyebrow}
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                {authCopy.login.title}
              </h1>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {authCopy.login.subtitle}
              </p>
            </header>
            <LoginForm onLogin={handleLogin} />
          </div>
        </div>
      </main>
    </div>
  );
}
