import { Link } from '@tanstack/react-router';
import { useAuthCopy } from '@/features/auth/copy';
import { BrandMark } from '@/features/auth/components/brand-mark';
import { AmbientField } from '@/shared/ui/ambient-field';

/**
 * Desktop-only brand panel beside the sign-in form, inside the login page's
 * `.landing` scope (so the trace field turns orange too). The page heading is
 * the form's "Sign in", so the tagline here is a paragraph, not a second h1.
 */
export function LoginHero() {
  const authCopy = useAuthCopy();
  return (
    <section
      data-slot="login-hero"
      className="relative isolate hidden min-h-svh overflow-hidden bg-background lg:flex"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <img
          src="/landing/hero-athlete.webp"
          alt=""
          width={960}
          height={637}
          decoding="async"
          className="landing-photo absolute inset-y-0 right-0 h-full w-3/4 object-cover opacity-45"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/60" />
        <div className="landing-glow -bottom-56 -left-40 size-[40rem] opacity-70" />
      </div>
      <AmbientField preset="login" className="opacity-80" />
      <div className="relative z-10 flex w-full max-w-2xl flex-col justify-between px-12 py-12 xl:px-16">
        <Link to="/" className="self-start rounded-md" aria-label={authCopy.backToSite}>
          <BrandMark />
        </Link>
        {/* data-field-clear: the ambient field keeps its traces away from this box. */}
        <div data-field-clear className="w-fit space-y-6">
          <p className="landing-display max-w-xl text-[clamp(3rem,5.5vw,5.5rem)] text-balance text-foreground">
            {authCopy.hero.title}
          </p>
          <p className="max-w-md text-base leading-relaxed text-pretty text-muted-foreground">{authCopy.hero.body}</p>
        </div>
        <p className="landing-eyebrow text-muted-foreground">{authCopy.hero.footer}</p>
      </div>
    </section>
  );
}
