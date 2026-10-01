import { useEffect, useId, useState } from 'react';
import { Link, Outlet } from '@tanstack/react-router';
import { Menu, X } from 'lucide-react';
import { BrandMark } from '@/features/auth/components/brand-mark';
import { useAccountDestination } from '@/features/public-site/hooks/use-account-destination';
import { usePublicSiteCopy } from '@/features/public-site/copy';
import type { PublicSitePath } from '@/features/public-site/lib/public-paths';
import { TrainingAssistant } from '@/features/training-assistant/components/training-assistant';
import { LanguageSwitcher } from '@/i18n/language-switcher';
import { buttonVariants } from '@/shared/ui/button-variants';
import { cn } from '@/shared/lib/utils';

type SectionKey = 'home' | 'training' | 'nutrition' | 'progress' | 'how';

/** Header links point at the landing's own sections (native scroll, no hijacking). */
const SECTION_ITEMS: ReadonlyArray<{ key: SectionKey; hash?: string }> = [
  { key: 'home' },
  { key: 'training', hash: 'entrenamiento' },
  { key: 'nutrition', hash: 'nutricion' },
  { key: 'progress', hash: 'progreso' },
  { key: 'how', hash: 'como-funciona' },
];

type PageKey = 'platform' | 'training' | 'progress' | 'about';

/** The detailed public pages stay reachable from the footer (and the mobile menu). */
const PAGE_ITEMS: ReadonlyArray<{ key: PageKey; to: PublicSitePath }> = [
  { key: 'platform', to: '/platform' },
  { key: 'training', to: '/training' },
  { key: 'progress', to: '/progress' },
  { key: 'about', to: '/about' },
];

const navLinkClass =
  'inline-flex min-h-11 items-center rounded-full px-3.5 text-[13px] font-medium tracking-wide text-muted-foreground uppercase transition-colors hover:text-foreground focus-visible:text-foreground';

function AccountAction({ onNavigate, className }: { onNavigate?: () => void; className?: string }) {
  const copy = usePublicSiteCopy();
  const account = useAccountDestination();
  return (
    <Link
      to={account.to}
      onClick={onNavigate}
      className={cn(
        buttonVariants(),
        'landing-cta h-10 min-h-11 rounded-full px-5 text-xs font-semibold tracking-wide whitespace-nowrap uppercase',
        className,
      )}
    >
      {account.signedIn ? account.label : copy.nav.start}
    </Link>
  );
}

/**
 * Transparent over the hero, then translucent black + blur once the page
 * scrolls. One passive listener; React only re-renders when the boolean flips.
 * No animation library here: this shell loads with every public page.
 */
function useHeaderScrolled() {
  const [scrolled, setScrolled] = useState(() => typeof window !== 'undefined' && window.scrollY > 12);
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 12);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);
  return scrolled;
}

/**
 * Public website shell (black + orange landing identity via `.landing`).
 * Renders for anonymous and signed-in visitors alike and never requests
 * private data; the assistant here uses the anonymous namespace.
 */
export function PublicSiteLayout() {
  const copy = usePublicSiteCopy();
  const account = useAccountDestination();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const scrolled = useHeaderScrolled();
  const closeMenu = () => setMenuOpen(false);

  // index.html carries default SEO tags for crawlers that skip JavaScript;
  // once mounted, each public route's own head tags replace them.
  useEffect(() => {
    document.querySelectorAll('meta[data-seo-default]').forEach((tag) => tag.remove());
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const solid = scrolled || menuOpen;

  return (
    <div className="landing flex min-h-svh flex-col overflow-x-clip bg-background text-foreground">
      <header
        data-scrolled={solid ? 'true' : 'false'}
        className={cn(
          'sticky top-0 z-[var(--z-sticky)] border-b transition-[background-color,border-color,backdrop-filter] duration-300 motion-reduce:transition-none',
          solid
            ? 'border-white/10 bg-black/70 backdrop-blur-xl supports-[backdrop-filter]:bg-black/55'
            : 'border-transparent bg-transparent',
        )}
      >
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-10">
          <Link to="/" onClick={closeMenu} className="rounded-md" aria-label={copy.nav.home}>
            <BrandMark compact />
          </Link>
          <nav aria-label={copy.nav.label} className="mx-auto hidden items-center gap-0.5 lg:flex">
            {SECTION_ITEMS.map((item) => (
              <Link key={item.key} to="/" hash={item.hash} activeOptions={{ exact: true, includeHash: true }} className={navLinkClass}>
                {copy.nav[item.key]}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1 lg:ml-0">
            <LanguageSwitcher />
            {account.signedIn ? null : (
              <Link to="/login" className={cn(navLinkClass, 'hidden sm:inline-flex')}>
                {copy.nav.signIn}
              </Link>
            )}
            <div className="ml-1 hidden sm:block">
              <AccountAction />
            </div>
            <button
              type="button"
              className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'size-11 lg:hidden')}
              aria-expanded={menuOpen}
              aria-controls={menuId}
              aria-label={menuOpen ? copy.nav.closeMenu : copy.nav.openMenu}
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
            </button>
          </div>
        </div>
        <div id={menuId} hidden={!menuOpen} className="max-h-[calc(100svh-4rem)] overflow-y-auto border-t border-white/10 lg:hidden">
          <nav aria-label={copy.nav.label} className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4 sm:px-6">
            {SECTION_ITEMS.map((item) => (
              <Link
                key={item.key}
                to="/"
                hash={item.hash}
                activeOptions={{ exact: true, includeHash: true }}
                onClick={closeMenu}
                className={cn(navLinkClass, 'text-base')}
              >
                {copy.nav[item.key]}
              </Link>
            ))}
            <p className="landing-eyebrow mt-4 px-3.5 text-muted-foreground">{copy.nav.pages}</p>
            {PAGE_ITEMS.map((item) => (
              <Link key={item.key} to={item.to} onClick={closeMenu} className={cn(navLinkClass, 'normal-case')}>
                {copy.nav[item.key]}
              </Link>
            ))}
            <div className="mt-4 flex flex-col gap-2 sm:hidden">
              {account.signedIn ? null : (
                <Link to="/login" onClick={closeMenu} className={cn(navLinkClass, 'justify-center border border-white/15')}>
                  {copy.nav.signIn}
                </Link>
              )}
              <AccountAction onNavigate={closeMenu} className="w-full" />
            </div>
          </nav>
        </div>
      </header>

      <main id="main-content" className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr] lg:px-10">
          <div className="space-y-4">
            <BrandMark />
            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">{copy.footer.note}</p>
          </div>
          <nav aria-label={copy.nav.pages}>
            <p className="landing-eyebrow text-muted-foreground">{copy.landing.footer.explore}</p>
            <ul className="mt-4 space-y-1">
              {PAGE_ITEMS.map((item) => (
                <li key={item.key}>
                  <Link
                    to={item.to}
                    activeOptions={{ exact: true }}
                    className="inline-flex min-h-9 items-center text-sm text-muted-foreground transition-colors hover:text-foreground data-[status=active]:text-primary"
                  >
                    {copy.nav[item.key]}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div>
            <p className="landing-eyebrow text-muted-foreground">{copy.landing.footer.access}</p>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">{copy.footer.access}</p>
            <Link
              to={account.to}
              className="mt-3 inline-flex min-h-9 items-center text-sm font-medium text-foreground underline-offset-4 hover:text-primary hover:underline"
            >
              {account.label}
            </Link>
          </div>
        </div>
      </footer>

      <TrainingAssistant placement="public" />
    </div>
  );
}
