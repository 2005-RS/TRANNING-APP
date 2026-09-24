import { useRouterState } from '@tanstack/react-router';
import type { NavItem } from '@/features/navigation/nav-config';
import { isPathActive } from '@/features/navigation/nav-config';
import { NavLink } from '@/features/navigation/nav-link';
import { useNavigationCopy } from '@/features/navigation/copy';
import { cn } from '@/shared/lib/utils';

export function ProductivitySidebarNav({
  items,
  onNavigate,
}: {
  items: NavItem[];
  onNavigate?: () => void;
}) {
  const navigationCopy = useNavigationCopy();
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <nav aria-label={navigationCopy.primaryNav} className="px-2">
      <ul className="space-y-1">
        {items.map((item) => {
          const active = isPathActive(pathname, item.to);
          const Icon = item.icon;
          return (
            <li key={item.to}>
              <NavLink
                to={item.to}
                aria-current={active ? 'page' : undefined}
                onClick={onNavigate}
                className={cn(
                  'flex min-h-10 items-center gap-3 rounded-md px-3 text-sm',
                  active
                    ? 'bg-muted font-medium text-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <Icon
                  className="size-4 shrink-0"
                  aria-hidden
                  strokeWidth={active ? 2.4 : 2}
                />
                <span>{item.label}</span>
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
