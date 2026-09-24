import { useState } from 'react';
import { toast } from 'sonner';
import { useAuthCopy } from '@/features/auth/copy';
import { useAuthSession } from '@/features/auth/hooks/use-auth-session';
import { useNavigationCopy } from '@/features/navigation/copy';
import { Badge } from '@/shared/ui/badge';
import { Avatar, AvatarFallback } from '@/shared/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import { Spinner } from '@/shared/ui/spinner';
import { useTheme } from '@/shared/lib/use-theme';
import type { ThemePreference } from '@/shared/lib/theme';
import { LanguageMenuItems } from '@/i18n/language-switcher';
import { cn } from '@/shared/lib/utils';

function initials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function UserMenu({ compact = false }: { compact?: boolean }) {
  const authCopy = useAuthCopy();
  const navigationCopy = useNavigationCopy();
  const { user, logout, logoutAll } = useAuthSession();
  const { preference, setPreference } = useTheme();
  const [pending, setPending] = useState<'logout' | 'logoutAll' | null>(null);

  if (!user) {
    return null;
  }

  const roleLabel = navigationCopy.roles[user.role];

  async function handleLogout() {
    setPending('logout');
    try {
      await logout();
      toast.success(authCopy.session.signedOut);
    } finally {
      setPending(null);
    }
  }

  async function handleLogoutAll() {
    setPending('logoutAll');
    try {
      await logoutAll();
      toast.success(authCopy.session.signedOutAll);
    } finally {
      setPending(null);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={navigationCopy.userMenu}
        className={cn(
          'inline-flex min-h-10 items-center gap-2 rounded-full px-1.5 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          compact && 'size-10 justify-center px-0',
        )}
      >
        <Avatar className={cn('size-8', compact && 'size-8 ring-1 ring-border')}>
          <AvatarFallback>{initials(user.firstName, user.lastName)}</AvatarFallback>
        </Avatar>
        {compact ? null : (
          <span className="hidden max-w-[10rem] truncate text-left text-sm font-medium lg:inline">
            {user.firstName} {user.lastName}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              {user.firstName} {user.lastName}
            </p>
            <Badge variant="muted">{roleLabel}</Badge>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <LanguageMenuItems />
        <DropdownMenuSeparator />
        <DropdownMenuLabel>{navigationCopy.theme}</DropdownMenuLabel>
        <DropdownMenuRadioGroup>
          {(
            [
              ['dark', navigationCopy.themeDark],
              ['light', navigationCopy.themeLight],
              ['system', navigationCopy.themeSystem],
            ] as const satisfies ReadonlyArray<readonly [ThemePreference, string]>
          ).map(([value, label]) => (
            <DropdownMenuRadioItem
              key={value}
              checked={preference === value}
              onSelect={() => setPreference(value)}
            >
              {label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={pending !== null}
          onSelect={() => void handleLogout()}
        >
          {pending === 'logout' ? <Spinner /> : null}
          {pending === 'logout' ? authCopy.session.signingOut : authCopy.session.logout}
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={pending !== null}
          onSelect={() => void handleLogoutAll()}
        >
          {pending === 'logoutAll' ? <Spinner /> : null}
          {pending === 'logoutAll'
            ? authCopy.session.signingOut
            : authCopy.session.logoutAll}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
