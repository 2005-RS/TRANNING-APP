import { Link } from '@tanstack/react-router';
import { BrandMark } from '@/features/auth/components/brand-mark';
import { LoginHero } from '@/features/auth/components/login-hero';
import { RegisterForm } from '@/features/auth/components/register-form';
import { useAuthCopy } from '@/features/auth/copy';
import { useAuthSession } from '@/features/auth/hooks/use-auth-session';
import type { RegisterDto } from '@/generated/models';
import { LanguageSwitcher } from '@/i18n/language-switcher';

export function RegisterPage({
  onDestinationChange,
}: {
  onDestinationChange: (destination: string | undefined) => void;
}) {
  const authCopy = useAuthCopy();
  const { register } = useAuthSession();

  async function handleRegister(dto: RegisterDto) {
    onDestinationChange('/client/welcome');
    try {
      await register(dto);
    } catch (error) {
      onDestinationChange(undefined);
      throw error;
    }
  }

  return (
    <div className="landing grid min-h-svh bg-background lg:grid-cols-[minmax(0,1fr)_minmax(22rem,36rem)]">
      <LoginHero />
      <main id="main-content" className="flex min-h-svh flex-col bg-background px-5 py-6 sm:px-8 lg:border-l lg:border-border lg:px-10 lg:py-10">
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
              <h1 className="landing-display text-4xl text-foreground">{authCopy.register.title}</h1>
              <p className="text-sm leading-relaxed text-muted-foreground">{authCopy.register.subtitle}</p>
            </header>
            <RegisterForm onRegister={handleRegister} />
          </div>
        </div>
      </main>
    </div>
  );
}
