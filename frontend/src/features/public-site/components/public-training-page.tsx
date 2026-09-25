import { Dumbbell, LibraryBig, ListChecks, Play, Timer, Layers } from 'lucide-react';
import {
  PublicAssistantNote,
  PublicFeatureGrid,
  PublicPageHero,
  PublicSignInCta,
} from '@/features/public-site/components/public-sections';
import { usePublicSiteCopy } from '@/features/public-site/copy';

export function PublicTrainingPage() {
  const { training } = usePublicSiteCopy();
  const { features } = training;

  return (
    <>
      <PublicPageHero eyebrow={training.eyebrow} heading={training.heading} body={training.body} />
      <PublicFeatureGrid
        items={[
          { key: 'templates', icon: Layers, ...features.templates },
          { key: 'plans', icon: ListChecks, ...features.plans },
          { key: 'start', icon: Play, ...features.start },
          { key: 'sets', icon: Dumbbell, ...features.sets },
          { key: 'rest', icon: Timer, ...features.rest },
          { key: 'exercises', icon: LibraryBig, ...features.exercises },
        ]}
      />
      <PublicAssistantNote />
      <PublicSignInCta />
    </>
  );
}
