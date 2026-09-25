import { Camera, ClipboardCheck, LineChart, Ruler } from 'lucide-react';
import {
  PublicAssistantNote,
  PublicFeatureGrid,
  PublicPageHero,
  PublicSignInCta,
} from '@/features/public-site/components/public-sections';
import { usePublicSiteCopy } from '@/features/public-site/copy';

export function PublicProgressPage() {
  const { progress } = usePublicSiteCopy();
  const { features } = progress;

  return (
    <>
      <PublicPageHero eyebrow={progress.eyebrow} heading={progress.heading} body={progress.body} />
      <PublicFeatureGrid
        columns={4}
        items={[
          { key: 'exercises', icon: LineChart, ...features.exercises },
          { key: 'measurements', icon: Ruler, ...features.measurements },
          { key: 'photos', icon: Camera, ...features.photos },
          { key: 'checkIns', icon: ClipboardCheck, ...features.checkIns },
        ]}
      />
      <PublicAssistantNote />
      <PublicSignInCta />
    </>
  );
}
