import { Dumbbell, LibraryBig, ListChecks, Play, Timer, Layers } from 'lucide-react';
import {
  PublicClosing,
  PublicFeatureGrid,
  PublicHeroPhoto,
  PublicPageHero,
} from '@/features/public-site/components/public-sections';
import { usePublicSiteCopy } from '@/features/public-site/copy';

export function PublicTrainingPage() {
  const { training } = usePublicSiteCopy();
  const { features } = training;

  return (
    <>
      <PublicPageHero
        eyebrow={training.title}
        heading={training.heading}
        body={training.body}
        visual={<PublicHeroPhoto src="/landing/training-cable.webp" width={960} height={640} className="object-[40%_center]" />}
      />
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
      <PublicClosing />
    </>
  );
}
