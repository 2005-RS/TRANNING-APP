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
import {
  PublicAssistantNote,
  PublicFeatureGrid,
  PublicPageHero,
  PublicSignInCta,
} from '@/features/public-site/components/public-sections';
import { usePublicSiteCopy } from '@/features/public-site/copy';

export function PublicPlatformPage() {
  const { platform } = usePublicSiteCopy();
  const { modules } = platform;

  return (
    <>
      <PublicPageHero eyebrow={platform.eyebrow} heading={platform.heading} body={platform.body} />
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
      <PublicAssistantNote />
      <PublicSignInCta />
    </>
  );
}
