import { useEffect, useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Link, useRouterState } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { BrandMark } from '@/features/auth/components/brand-mark';
import { ClientBottomNav, ClientMoreSheetList } from '@/features/navigation/client-bottom-nav';
import { useClientNavCopy, useNavigationCopy } from '@/features/navigation/copy';
import { isClientWorkoutFocusPath } from '@/features/navigation/route-meta';
import { useCurrentRouteMeta } from '@/features/navigation/use-current-route-meta';
import { UserMenu } from '@/app/shells/user-menu';
import { ThemeCycleButton } from '@/features/auth/components/theme-cycle-button';
import { LanguageSwitcher } from '@/i18n/language-switcher';
import { useCommonCopy } from '@/i18n/locales/common-live';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/shared/ui/sheet';
import { cn } from '@/shared/lib/utils';
import { buttonVariants } from '@/shared/ui/button-variants';

export function ClientAppShell({ children }: { children: ReactNode }) {
  const clientCopy = useClientNavCopy();
  const navigationCopy = useNavigationCopy();
  const commonCopy = useCommonCopy();
  const meta = useCurrentRouteMeta();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const reduceMotion = useReducedMotion();
  const [moreOpen, setMoreOpen] = useState(false);
  const focusMode = isClientWorkoutFocusPath(pathname);

  useEffect(() => {
    document.title = meta.documentTitle;
  }, [meta.documentTitle]);

  useEffect(() => {
    if (!focusMode) {
      setMoreOpen(false);
    }
  }, [focusMode]);

  return (
    <div className={cn('client-app-shell min-h-svh', focusMode && 'client-workout-focus')}>
      <header
        className={cn(
          'client-app-chrome sticky top-0 flex h-14 min-w-0 items-center gap-2 border-b border-border/70 px-4 pt-[env(safe-area-inset-top)]',
          focusMode ? 'z-[var(--z-workout-focus)]' : 'z-[var(--z-sticky)]',
        )}
      >
        {focusMode ? (
          <Link
            to="/client/training"
            aria-label={clientCopy.workout.close}
            className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'size-11 min-h-11 min-w-11')}
          >
            <ArrowLeft className="size-5" aria-hidden />
          </Link>
        ) : (
          <BrandMark compact className="min-w-0" />
        )}
        {focusMode ? (
          <p className="min-w-0 truncate text-sm font-semibold">{clientCopy.workout.title}</p>
        ) : null}
        <div className="ml-auto flex items-center gap-1">
          {focusMode ? null : <LanguageSwitcher compact />}
          <ThemeCycleButton />
          <UserMenu compact />
        </div>
      </header>
      <main
        id="main-content"
        className={
          focusMode
            ? 'pb-[env(safe-area-inset-bottom)]'
            : 'pb-[calc(4.25rem+env(safe-area-inset-bottom))]'
        }
      >
        <motion.div
          key={pathname}
          initial={reduceMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.18, ease: [0.16, 1, 0.3, 1] }}
        >
          {children}
        </motion.div>
      </main>
      {focusMode ? null : (
        <ClientBottomNav onMorePress={() => setMoreOpen(true)} />
      )}
      {focusMode ? null : (
        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetContent side="bottom">
            <SheetHeader>
              <SheetTitle>{navigationCopy.moreNav}</SheetTitle>
              <SheetDescription>{clientCopy.more.description}</SheetDescription>
            </SheetHeader>
            <ClientMoreSheetList onNavigate={() => setMoreOpen(false)} />
            <div className="border-t border-border px-4 py-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                {commonCopy.language.label}
              </p>
              <LanguageSwitcher />
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
