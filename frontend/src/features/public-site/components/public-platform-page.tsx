import {
  Apple,
  Camera,
  ClipboardCheck,
  ClipboardList,
  LayoutDashboard,
  LineChart,
  Settings2,
  Timer,
} from 'lucide-react';
import { DashboardScreen, PhoneFrame } from '@/features/public-site/components/landing/app-screens';
import {
  PublicClosing,
  PublicFeatureGrid,
  PublicPageHero,
} from '@/features/public-site/components/public-sections';
import { usePublicSiteCopy } from '@/features/public-site/copy';

export function PublicPlatformPage() {
  const { platform, landing } = usePublicSiteCopy();
  const { modules } = platform;

  return (
    <>
      <PublicPageHero
        eyebrow={platform.title}
        heading={platform.heading}
        body={platform.body}
        visual={
          <div className="relative mx-auto w-full max-w-[17rem]">
            <div aria-hidden className="landing-glow top-1/2 left-1/2 size-[30rem] -translate-1/2 opacity-70" />
            <PhoneFrame>
              <DashboardScreen s={landing.screens} />
            </PhoneFrame>
            <p className="mt-8 text-center text-[11px] tracking-wider text-muted-foreground/70 uppercase">{landing.demoLabel}</p>
          </div>
        }
      />
      <PublicFeatureGrid
        columns={4}
        items={[
          { key: 'training', icon: ClipboardList, ...modules.training },
          { key: 'focus', icon: Timer, ...modules.focus },
          { key: 'progress', icon: LineChart, ...modules.progress },
          { key: 'body', icon: Camera, ...modules.body },
          { key: 'nutrition', icon: Apple, ...modules.nutrition },
          { key: 'checkIns', icon: ClipboardCheck, ...modules.checkIns },
          { key: 'trainer', icon: LayoutDashboard, ...modules.trainer },
          { key: 'admin', icon: Settings2, ...modules.admin },
        ]}
      />
      <PublicClosing />
    </>
  );
}
