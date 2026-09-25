import { useId, useState } from 'react';
import { Link, Outlet } from '@tanstack/react-router';
import { Menu, X } from 'lucide-react';
import { BrandMark } from '@/features/auth/components/brand-mark';
import { ThemeCycleButton } from '@/features/auth/components/theme-cycle-button';
import { useAccountDestination } from '@/features/public-site/hooks/use-account-destination';
import { usePublicSiteCopy } from '@/features/public-site/copy';
import type { PublicSitePath } from '@/features/public-site/lib/public-paths';
import { TrainingAssistant } from '@/features/training-assistant/components/training-assistant';
import { LanguageSwitcher } from '@/i18n/language-switcher';
import { buttonVariants } from '@/shared/ui/button-variants';
import { cn } from '@/shared/lib/utils';

type NavKey = 'home' | 'platform' | 'training' | 'progress' | 'about';

const NAV_ITEMS: ReadonlyArray<{ key: NavKey; to: PublicSitePath }> = [
  { key: 'home', to: '/' },
  { key: 'platform', to: '/platform' },
  { key: 'training', to: '/training' },
  { key: 'progress', to: '/progress' },
  { key: 'about', to: '/about' },
];

const navLinkClass =
  'inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground data-[status=active]:text-foreground';

function AccountAction({ onNavigate }: { onNavigate?: () => void }) {
  const account = useAccountDestination();
  return (
    <Link
      to={account.to}
      onClick={onNavigate}
      className={cn(buttonVariants(), 'min-h-11 whitespace-nowrap')}
    >
      {account.label}
    </Link>
  );
}

/**
 * Public website shell. Renders for anonymous and signed-in visitors alike and
 * never requests private data; the assistant here uses the anonymous namespace.
 */
export function PublicSiteLayout() {
  const copy = usePublicSiteCopy();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <header className="sticky top-0 z-[var(--z-sticky)] border-b border-border bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Link to="/" onClick={closeMenu} className="rounded-md" aria-label={copy.nav.home}>
            <BrandMark compact />
          </Link>
          <nav aria-label={copy.nav.label} className="ml-4 hidden items-center gap-1 md:flex">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.key}
                to={item.to}
                activeOptions={{ exact: true }}
                className={navLinkClass}
              >
                {copy.nav[item.key]}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <LanguageSwitcher />
            <ThemeCycleButton />
            <div className="ml-1 hidden sm:block">
              <AccountAction />
            </div>
            <button
              type="button"
              className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'size-11 md:hidden')}
              aria-expanded={menuOpen}
              aria-controls={menuId}
              aria-label={menuOpen ? copy.nav.closeMenu : copy.nav.openMenu}
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
            </button>
          </div>
        </div>
        <div id={menuId} hidden={!menuOpen} className="border-t border-border md:hidden">
          <nav aria-label={copy.nav.label} className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.key}
                to={item.to}
                activeOptions={{ exact: true }}
                onClick={closeMenu}
                className={cn(navLinkClass, 'text-base')}
              >
                {copy.nav[item.key]}
              </Link>
            ))}
            <div className="mt-2 sm:hidden">
              <AccountAction onNavigate={closeMenu} />
            </div>
          </nav>
        </div>
      </header>

      <main id="main-content" className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-muted-foreground sm:px-6 md:flex-row md:items-center md:justify-between">
          <BrandMark compact />
          <div className="space-y-1 md:text-right">
            <p>{copy.footer.note}</p>
            <p>{copy.footer.access}</p>
          </div>
        </div>
      </footer>

      <TrainingAssistant placement="public" />
    </div>
  );
}
