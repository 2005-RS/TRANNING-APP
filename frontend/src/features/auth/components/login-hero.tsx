import { Link } from '@tanstack/react-router';
import { useAuthCopy } from '@/features/auth/copy';
import { BrandMark } from '@/features/auth/components/brand-mark';

export function LoginHero() {
  const authCopy = useAuthCopy();
  return (
    <section
      data-slot="login-hero"
      className="relative hidden min-h-svh overflow-hidden bg-background lg:flex"
    >
      <div
        aria-hidden
        className="login-hero-atmosphere pointer-events-none absolute inset-0"
      />
      <div className="relative z-10 flex w-full max-w-xl flex-col justify-between px-12 py-12 xl:px-16">
        <Link to="/" className="self-start rounded-md" aria-label={authCopy.backToSite}>
          <BrandMark />
        </Link>
        <div className="space-y-5">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
            {authCopy.hero.eyebrow}
          </p>
          <h1 className="max-w-md text-4xl font-semibold tracking-tight text-foreground xl:text-5xl">
            {authCopy.hero.title}
          </h1>
          <p className="max-w-md text-base leading-relaxed text-muted-foreground">
            {authCopy.hero.body}
          </p>
        </div>
        <p className="text-xs tracking-[0.18em] text-muted-foreground">
          {authCopy.hero.footer}
        </p>
      </div>
    </section>
  );
}
