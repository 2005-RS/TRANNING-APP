import { Menu } from 'lucide-react';
import { BrandMark } from '@/features/auth/components/brand-mark';
import { ThemeCycleButton } from '@/features/auth/components/theme-cycle-button';
import { LanguageSwitcher } from '@/i18n/language-switcher';
import { useNavigationCopy } from '@/features/navigation/copy';
import { UserMenu } from '@/app/shells/user-menu';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/lib/utils';

export function ShellHeader({
  title,
  onOpenNavigation,
  showBrand = false,
  compact = false,
}: {
  title: string;
  onOpenNavigation?: () => void;
  showBrand?: boolean;
  compact?: boolean;
}) {
  const navigationCopy = useNavigationCopy();
  return (
    <header
      className={cn(
        'sticky top-0 z-[var(--z-sticky)] flex items-center gap-3 border-b border-border bg-background/95 px-3 backdrop-blur-sm',
        compact
          ? 'min-h-14 pt-[env(safe-area-inset-top)]'
          : 'min-h-14 lg:min-h-16',
      )}
    >
      {onOpenNavigation ? (
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          aria-label={navigationCopy.openNavigation}
          onClick={onOpenNavigation}
        >
          <Menu className="size-5" aria-hidden />
        </Button>
      ) : null}
      {showBrand ? <BrandMark compact className="min-w-0 flex-1" /> : null}
      <p
        className={cn(
          'min-w-0 flex-1 truncate font-medium tracking-tight text-foreground',
          showBrand ? 'hidden' : 'text-base',
          compact && 'text-base',
        )}
      >
        {title}
      </p>
      <div className="ml-auto flex items-center gap-1">
        <LanguageSwitcher compact className="sm:hidden" />
        <div className="hidden sm:block">
          <LanguageSwitcher />
        </div>
        <div className="hidden sm:block">
          <ThemeCycleButton />
        </div>
        <UserMenu compact={compact} />
      </div>
    </header>
  );
}
