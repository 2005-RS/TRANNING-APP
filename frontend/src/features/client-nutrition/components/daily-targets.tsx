import type { NutritionPlanResponseDto } from '@/generated/models';
import { clientNutritionCopy } from '@/features/client-nutrition/copy';
import { formatGrams, formatKcal } from '@/features/client-nutrition/lib/formatters';
import { macroShare, sharePercent } from '@/features/client-nutrition/lib/macro-share';
import { plannedOfTargetPercent } from '@/features/client-nutrition/lib/plan-helpers';
import { interpolate } from '@/i18n/format';

function MacroRing({
  label,
  value,
  percent,
  tone,
}: {
  label: string;
  value: string;
  percent: number | null;
  tone: 'chart-1' | 'chart-2' | 'chart-3';
}) {
  const width = percent === null ? 0 : Math.min(100, Math.max(0, percent));
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (width / 100) * circumference;
  const strokeClass =
    tone === 'chart-1' ? 'stroke-chart-1' : tone === 'chart-2' ? 'stroke-chart-2' : 'stroke-chart-3';

  return (
    <div className="flex min-w-0 flex-col items-center gap-2 text-center">
      <svg viewBox="0 0 48 48" className="size-14" aria-hidden>
        <circle
          cx="24"
          cy="24"
          r={radius}
          fill="none"
          className="stroke-secondary"
          strokeWidth="6"
        />
        <circle
          cx="24"
          cy="24"
          r={radius}
          fill="none"
          className={strokeClass}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 24 24)"
        />
      </svg>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-numeric text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

export function DailyTargets({ plan }: { plan: NutritionPlanResponseDto }) {
  const { targets, mealPlanTotals } = plan;
  const calories = formatKcal(targets.caloriesKcal ?? null);
  const planned = formatKcal(mealPlanTotals.caloriesKcal);
  const protein = formatGrams(targets.proteinG ?? null);
  const carbs = formatGrams(targets.carbohydratesG ?? null);
  const fat = formatGrams(targets.fatG ?? null);
  const share = macroShare(targets);
  const plannedPercent = plannedOfTargetPercent(
    mealPlanTotals.caloriesKcal,
    targets.caloriesKcal ?? null,
  );
  const hasAny = calories || protein || carbs || fat;

  return (
    <section className="client-surface-card space-y-5" aria-labelledby="nutrition-targets-heading">
      <div>
        <h2 id="nutrition-targets-heading" className="text-lg font-semibold tracking-tight">
          {clientNutritionCopy.targets.title}
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          {clientNutritionCopy.targets.description}
        </p>
      </div>

      {hasAny ? (
        <>
          {calories ? (
            <div className="space-y-3">
              <p className="text-numeric text-4xl font-medium tracking-tight">{calories}</p>
              {planned && plannedPercent !== null ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {interpolate(clientNutritionCopy.targets.plannedOfTarget, {
                      planned,
                      target: calories,
                    })}
                  </p>
                  <div
                    className="h-2 overflow-hidden rounded-full bg-secondary"
                    role="meter"
                    aria-label={clientNutritionCopy.targets.plannedProgress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(plannedPercent)}
                  >
                    <div
                      className="h-full rounded-full bg-primary motion-safe:transition-[width] motion-safe:duration-200"
                      style={{ width: `${plannedPercent}%` }}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
          {share ? (
            <div className="space-y-3">
              <p className="sr-only">{clientNutritionCopy.targets.macroChart}</p>
              <div className="grid grid-cols-3 gap-3">
                {protein ? (
                  <MacroRing
                    label={clientNutritionCopy.targets.protein}
                    value={protein}
                    percent={sharePercent(share.protein, share.total)}
                    tone="chart-1"
                  />
                ) : null}
                {carbs ? (
                  <MacroRing
                    label={clientNutritionCopy.targets.carbs}
                    value={carbs}
                    percent={sharePercent(share.carbohydrates, share.total)}
                    tone="chart-2"
                  />
                ) : null}
                {fat ? (
                  <MacroRing
                    label={clientNutritionCopy.targets.fat}
                    value={fat}
                    percent={sharePercent(share.fat, share.total)}
                    tone="chart-3"
                  />
                ) : null}
              </div>
            </div>
          ) : (
            <dl className="grid grid-cols-1 gap-4 min-[400px]:grid-cols-3">
              {protein ? (
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">
                    {clientNutritionCopy.targets.protein}
                  </dt>
                  <dd className="text-numeric mt-1 text-lg font-medium">{protein}</dd>
                </div>
              ) : null}
              {carbs ? (
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">
                    {clientNutritionCopy.targets.carbs}
                  </dt>
                  <dd className="text-numeric mt-1 text-lg font-medium">{carbs}</dd>
                </div>
              ) : null}
              {fat ? (
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">
                    {clientNutritionCopy.targets.fat}
                  </dt>
                  <dd className="text-numeric mt-1 text-lg font-medium">{fat}</dd>
                </div>
              ) : null}
            </dl>
          )}
        </>
      ) : (
        <p className="text-sm leading-relaxed text-muted-foreground">
          {clientNutritionCopy.targets.none}
        </p>
      )}
    </section>
  );
}
