import { useEffect, type ReactNode, useState } from 'react';
import { motion } from 'motion/react';
import { useRouterState } from '@tanstack/react-router';
import { BrandMark } from '@/features/auth/components/brand-mark';
import { useNavigationCopy } from '@/features/navigation/copy';
import type { NavItem } from '@/features/navigation/nav-config';
import { ProductivitySidebarNav } from '@/features/navigation/productivity-sidebar';
import { useCurrentRouteMeta } from '@/features/navigation/use-current-route-meta';
import {
  NavUnreadBadge,
  type NotificationsPath,
} from '@/features/notifications/components/unread-indicators';
import { ShellHeader } from '@/app/shells/shell-header';
import { TrainingAssistant } from '@/features/training-assistant/components/training-assistant';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/shared/ui/sheet';
import {
  motionTransition,
  revealHidden,
  revealVisible,
  useReducedMotion,
} from '@/shared/lib/motion';

export function ProductivityShell({
  roleLabel,
  items,
  notificationsPath,
  children,
}: {
  roleLabel: string;
  items: NavItem[];
  notificationsPath: NotificationsPath;
  children: ReactNode;
}) {
  const navigationCopy = useNavigationCopy();
  const meta = useCurrentRouteMeta();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const reduceMotion = useReducedMotion();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const badges = { [notificationsPath]: <NavUnreadBadge /> };

  useEffect(() => {
    document.title = meta.documentTitle;
  }, [meta.documentTitle]);

  return (
    <div className="min-h-svh bg-background">
      <div className="lg:grid lg:grid-cols-[var(--sidebar-width)_minmax(0,1fr)]">
        <aside className="sticky top-0 hidden h-svh flex-col border-r border-border bg-card lg:flex">
          <div className="flex h-16 items-center gap-2 border-b border-border px-4">
            <BrandMark compact />
          </div>
          <p className="px-5 pb-2 pt-4 text-[0.65rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {roleLabel}
          </p>
          <div className="flex-1 overflow-y-auto py-1">
            <ProductivitySidebarNav items={items} badges={badges} />
          </div>
        </aside>
        <div className="flex min-w-0 flex-col">
          <ShellHeader
            title={meta.title}
            notificationsPath={notificationsPath}
            onOpenNavigation={() => setMobileNavOpen(true)}
          />
          <main id="main-content" className="min-h-0 flex-1">
            <motion.div
              key={pathname}
              initial={revealHidden(reduceMotion)}
              animate={revealVisible}
              transition={motionTransition('fast', reduceMotion)}
            >
              {children}
            </motion.div>
          </main>
        </div>
      </div>
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left">
          <SheetHeader>
            <SheetTitle>{navigationCopy.primaryNav}</SheetTitle>
            <SheetDescription className="sr-only">
              {roleLabel}
            </SheetDescription>
          </SheetHeader>
          <div className="px-2 pb-2">
            <BrandMark compact />
            <p className="mt-3 px-3 text-[0.65rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {roleLabel}
            </p>
          </div>
          <ProductivitySidebarNav
            items={items}
            badges={badges}
            onNavigate={() => setMobileNavOpen(false)}
          />
        </SheetContent>
      </Sheet>
      <TrainingAssistant placement="productivity" />
    </div>
  );
}
