import { LandingBenefits } from '@/features/public-site/components/landing/landing-benefits';
import { LandingFinal, LandingSteps } from '@/features/public-site/components/landing/landing-closing';
import { LandingGoals } from '@/features/public-site/components/landing/landing-goals';
import { LandingHero } from '@/features/public-site/components/landing/landing-hero';
import { LandingNutrition } from '@/features/public-site/components/landing/landing-nutrition';
import { LandingProgress } from '@/features/public-site/components/landing/landing-progress';
import { LandingShowcase } from '@/features/public-site/components/landing/landing-showcase';
import { LandingTraining } from '@/features/public-site/components/landing/landing-training';

/**
 * Landing page: one continuous story on native scroll. Hero → what you get →
 * goals → the app (pinned showcase) → training → nutrition → progress → how it
 * works → final call to action. Every number shown is labelled sample data.
 */
export function PublicHomePage() {
  return (
    <>
      <LandingHero />
      <LandingBenefits />
      <LandingGoals />
      <LandingShowcase />
      <LandingTraining />
      <LandingNutrition />
      <LandingProgress />
      <LandingSteps />
      <LandingFinal />
    </>
  );
}
