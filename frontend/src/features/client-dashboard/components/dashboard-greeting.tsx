import { useAuthSession } from '@/features/auth/hooks/use-auth-session';
import {
  formatLocalDateContext,
  greetingHeadline,
  greetingSupportLine,
} from '@/features/client-dashboard/lib/greeting';
import { useLanguage } from '@/i18n/use-language';
import { SectionReveal } from '@/shared/ui/section-reveal';

export function DashboardGreeting() {
  useLanguage();
  const { user } = useAuthSession();
  const now = new Date();

  return (
    <SectionReveal>
      <header className="space-y-2">
        <p className="text-sm leading-none text-muted-foreground">{formatLocalDateContext(now)}</p>
        <div className="space-y-1">
          <h1 className="text-balance text-[1.85rem] font-semibold leading-[1.12] tracking-tight text-foreground sm:text-3xl">
            {greetingHeadline(user?.firstName, now)}
          </h1>
          <p className="text-base leading-snug text-muted-foreground">
            {greetingSupportLine(now)}
          </p>
        </div>
      </header>
    </SectionReveal>
  );
}
