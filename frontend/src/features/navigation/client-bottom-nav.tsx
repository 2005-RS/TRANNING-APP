import { useRouterState } from '@tanstack/react-router';
import { useClientNavCopy, useNavigationCopy } from '@/features/navigation/copy';
import {
  getClientMoreNav,
  getClientMoreTab,
  getClientPrimaryNav,
  isClientMoreActive,
  isPathActive,
} from '@/features/navigation/nav-config';
import { cn } from '@/shared/lib/utils';
import { NavLink } from '@/features/navigation/nav-link';

export function ClientBottomNav({
  onMorePress,
}: {
  onMorePress: () => void;
}) {
  const clientCopy = useClientNavCopy();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const moreActive = isClientMoreActive(pathname);
  const clientPrimaryNav = getClientPrimaryNav();
  const clientMoreTab = getClientMoreTab();

  return (
    <nav
      aria-label={clientCopy.mainNav}
      className="client-app-chrome fixed inset-x-0 bottom-0 z-[var(--z-sticky)] border-t border-border/70 pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5 gap-0.5 px-1.5 pt-1.5">
        {clientPrimaryNav.map((item) => {
          const active = isPathActive(pathname, item.to);
          const Icon = item.icon;
          return (
            <li key={item.to}>
              <NavLink
                to={item.to}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-center text-[0.7rem] font-medium leading-tight transition-colors duration-200 focus-visible:outline-none sm:text-xs',
                  active
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    'h-0.5 w-5 rounded-full',
                    active ? 'bg-foreground' : 'bg-transparent',
                  )}
                />
                <Icon className="size-5" aria-hidden strokeWidth={active ? 2.4 : 1.9} />
                <span className={cn('line-clamp-2', active && 'font-semibold')}>{item.label}</span>
              </NavLink>
            </li>
          );
        })}
        <li>
          <button
            type="button"
            aria-current={moreActive ? 'page' : undefined}
            aria-haspopup="dialog"
            className={cn(
              'flex min-h-14 w-full flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-center text-[0.7rem] font-medium leading-tight transition-colors duration-200 focus-visible:outline-none sm:text-xs',
              moreActive
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
            onClick={onMorePress}
          >
            <span
              aria-hidden
              className={cn(
                'h-0.5 w-5 rounded-full',
                moreActive ? 'bg-foreground' : 'bg-transparent',
              )}
            />
            <clientMoreTab.icon
              className="size-5"
              aria-hidden
              strokeWidth={moreActive ? 2.4 : 1.9}
            />
            <span className={cn('line-clamp-2', moreActive && 'font-semibold')}>
              {clientMoreTab.label}
            </span>
          </button>
        </li>
      </ul>
    </nav>
  );
}

export function ClientMoreSheetList({
  onNavigate,
}: {
  onNavigate: () => void;
}) {
  const navigationCopy = useNavigationCopy();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const clientMoreNav = getClientMoreNav();

  return (
    <nav aria-label={navigationCopy.moreNav}>
      <ul className="space-y-1 p-2">
        {clientMoreNav.map((item) => {
          const active = isPathActive(pathname, item.to);
          const Icon = item.icon;
          return (
            <li key={item.to}>
              <NavLink
                to={item.to}
                aria-current={active ? 'page' : undefined}
                onClick={onNavigate}
                className={cn(
                  'flex min-h-12 items-center gap-3 rounded-lg px-3 text-base',
                  active
                    ? 'bg-muted font-semibold text-foreground'
                    : 'text-foreground hover:bg-muted',
                )}
              >
                <Icon className="size-5" aria-hidden />
                {item.label}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
