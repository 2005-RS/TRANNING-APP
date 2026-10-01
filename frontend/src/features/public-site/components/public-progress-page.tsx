import { Camera, ClipboardCheck, LineChart, Ruler } from 'lucide-react';
import { ProgressScreen, PhoneFrame } from '@/features/public-site/components/landing/app-screens';
import {
  PublicClosing,
  PublicFeatureGrid,
  PublicPageHero,
} from '@/features/public-site/components/public-sections';
import { usePublicSiteCopy } from '@/features/public-site/copy';

export function PublicProgressPage() {
  const { progress, landing } = usePublicSiteCopy();
  const { features } = progress;

  return (
    <>
      <PublicPageHero
        eyebrow={progress.title}
        heading={progress.heading}
        body={progress.body}
        visual={
          <div className="relative mx-auto w-full max-w-[17rem]">
            <div aria-hidden className="landing-glow top-1/2 left-1/2 size-[30rem] -translate-1/2 opacity-70" />
            <PhoneFrame>
              <ProgressScreen s={landing.screens} />
            </PhoneFrame>
            <p className="mt-8 text-center text-[11px] tracking-wider text-muted-foreground/70 uppercase">{landing.demoLabel}</p>
          </div>
        }
      />
      <PublicFeatureGrid
        columns={4}
        items={[
          { key: 'exercises', icon: LineChart, ...features.exercises },
          { key: 'measurements', icon: Ruler, ...features.measurements },
          { key: 'photos', icon: Camera, ...features.photos },
          { key: 'checkIns', icon: ClipboardCheck, ...features.checkIns },
        ]}
      />
      <PublicClosing />
    </>
  );
}
