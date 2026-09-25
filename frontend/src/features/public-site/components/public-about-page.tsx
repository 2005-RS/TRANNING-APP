import { Bot, KeyRound, Languages, Lock } from 'lucide-react';
import {
  PublicFeatureGrid,
  PublicPageHero,
  PublicSignInCta,
} from '@/features/public-site/components/public-sections';
import { usePublicSiteCopy } from '@/features/public-site/copy';

export function PublicAboutPage() {
  const { about } = usePublicSiteCopy();
  const { sections } = about;

  return (
    <>
      <PublicPageHero eyebrow={about.eyebrow} heading={about.heading} body={about.body} />
      <PublicFeatureGrid
        columns={2}
        items={[
          { key: 'privacy', icon: Lock, ...sections.privacy },
          { key: 'access', icon: KeyRound, ...sections.access },
          { key: 'assistant', icon: Bot, ...sections.assistant },
          { key: 'languages', icon: Languages, ...sections.languages },
        ]}
      />
      <PublicSignInCta />
    </>
  );
}
