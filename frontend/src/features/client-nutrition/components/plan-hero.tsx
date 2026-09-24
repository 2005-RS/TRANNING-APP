import { Calendar, Target } from 'lucide-react';
import type { NutritionPlanResponseDto } from '@/generated/models';
import { NutritionPlanResponseDtoStatus } from '@/generated/models';
import { clientNutritionCopy } from '@/features/client-nutrition/copy';
import { formatPlanDateRange } from '@/features/client-nutrition/lib/formatters';

function statusLabel(status: NutritionPlanResponseDto['status']): string {
  if (status === NutritionPlanResponseDtoStatus.ACTIVE) {
    return clientNutritionCopy.plan.statusActive;
  }
  if (status === NutritionPlanResponseDtoStatus.ARCHIVED) {
    return clientNutritionCopy.plan.statusArchived;
  }
  return clientNutritionCopy.plan.statusDraft;
}

export function PlanHero({ plan }: { plan: NutritionPlanResponseDto }) {
  const range = formatPlanDateRange(plan.startDate, plan.endDate);
  const status = statusLabel(plan.status);

  return (
    <section className="client-surface-card dashboard-hero-card space-y-5" aria-labelledby="nutrition-plan-name">
      <div className="flex items-start gap-3.5">
        <span className="mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Target className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            {clientNutritionCopy.plan.eyebrow}
          </p>
          <h2
            id="nutrition-plan-name"
            className="text-[1.55rem] font-semibold leading-tight tracking-tight"
          >
            {plan.name}
          </h2>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-foreground">
              {status}
            </span>
            {range ? (
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="size-3.5" aria-hidden />
                {range}
              </span>
            ) : null}
          </p>
        </div>
      </div>
      {plan.description ? (
        <p className="text-sm leading-relaxed text-muted-foreground">{plan.description}</p>
      ) : null}
      <p className="text-sm leading-relaxed text-muted-foreground">
        {clientNutritionCopy.prescribedHint}
      </p>
    </section>
  );
}
