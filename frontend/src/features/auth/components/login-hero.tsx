import { Link } from '@tanstack/react-router';
import { useAuthCopy } from '@/features/auth/copy';
import { BrandMark } from '@/features/auth/components/brand-mark';
import { AmbientField } from '@/shared/ui/ambient-field';

/**
 * Desktop-only brand panel beside the sign-in form. The page heading is the
 * form's "Sign in", so the tagline here is a paragraph, not a second h1.
 */
export function LoginHero() {
  const authCopy = useAuthCopy();
  return (
    <section
      data-slot="login-hero"
      className="relative isolate hidden min-h-svh overflow-hidden bg-background lg:flex"
    >
      <AmbientField preset="login" />
      <div className="relative z-10 flex w-full max-w-2xl flex-col justify-between px-12 py-12 xl:px-16">
        <Link to="/" className="self-start rounded-md" aria-label={authCopy.backToSite}>
          <BrandMark />
        </Link>
        {/* data-field-clear: the ambient field keeps its traces away from this box. */}
        <div data-field-clear className="w-fit space-y-6">
          <p className="text-hero max-w-xl text-balance text-foreground">{authCopy.hero.title}</p>
          <p className="max-w-md text-pretty text-base leading-relaxed text-muted-foreground">
            {authCopy.hero.body}
          </p>
        </div>
        <p className="text-sm text-muted-foreground">{authCopy.hero.footer}</p>
      </div>
    </section>
  );
}
