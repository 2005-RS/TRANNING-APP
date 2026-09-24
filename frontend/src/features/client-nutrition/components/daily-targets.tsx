import type { NutritionTargetsDto } from '@/generated/models';
import { clientNutritionCopy } from '@/features/client-nutrition/copy';
import { formatGrams, formatKcal } from '@/features/client-nutrition/lib/formatters';
import { macroShare, sharePercent } from '@/features/client-nutrition/lib/macro-share';

function MacroBar({
  label,
  value,
  percent,
}: {
  label: string;
  value: string;
  percent: number | null;
}) {
  const width = percent === null ? 0 : Math.min(100, Math.max(0, percent));
  return (
    <div className="min-w-0 space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-numeric text-sm font-medium text-foreground">{value}</p>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-secondary"
        aria-hidden
      >
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

export function DailyTargets({ targets }: { targets: NutritionTargetsDto }) {
  const calories = formatKcal(targets.caloriesKcal ?? null);
  const protein = formatGrams(targets.proteinG ?? null);
  const carbs = formatGrams(targets.carbohydratesG ?? null);
  const fat = formatGrams(targets.fatG ?? null);
  const share = macroShare(targets);
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
            <p className="text-numeric text-4xl font-medium tracking-tight">{calories}</p>
          ) : null}
          {share ? (
            <div className="space-y-4">
              <p className="sr-only">{clientNutritionCopy.targets.macroChart}</p>
              <div className="grid grid-cols-1 gap-4 min-[400px]:grid-cols-3">
                {protein ? (
                  <MacroBar
                    label={clientNutritionCopy.targets.protein}
                    value={protein}
                    percent={sharePercent(share.protein, share.total)}
                  />
                ) : null}
                {carbs ? (
                  <MacroBar
                    label={clientNutritionCopy.targets.carbs}
                    value={carbs}
                    percent={sharePercent(share.carbohydrates, share.total)}
                  />
                ) : null}
                {fat ? (
                  <MacroBar
                    label={clientNutritionCopy.targets.fat}
                    value={fat}
                    percent={sharePercent(share.fat, share.total)}
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
