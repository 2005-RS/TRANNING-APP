import type { JournalDayResponseDto } from '@/generated/models';
import { useClientNutritionCopy } from '@/features/client-nutrition/copy';
import { formatNutritionAmount } from '@/features/client-nutrition/lib/formatters';
import { interpolate } from '@/i18n/format';
import { cn } from '@/shared/lib/utils';

function percent(value: number, target: number | null): number {
  if (target === null || target <= 0) return 0;
  return Math.min(100, Math.max(0, (value / target) * 100));
}

function Ring({
  value,
  size,
  stroke,
  className,
}: {
  value: number;
  size: number;
  stroke: number;
  className: string;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="size-full -rotate-90" aria-hidden>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        strokeWidth={stroke}
        className="stroke-secondary"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference - (value / 100) * circumference}
        className={cn('motion-safe:transition-[stroke-dashoffset] motion-safe:duration-300', className)}
      />
    </svg>
  );
}

/** Consumed vs prescribed. The target is the coach's; the Client cannot edit it (U4). */
export function JournalSummaryCard({ day }: { day: JournalDayResponseDto }) {
  const copy = useClientNutritionCopy();
  const target = day.targets.caloriesKcal ?? null;
  const consumed = day.consumed.caloriesKcal;
  const remaining = day.remainingCaloriesKcal ?? null;
  const over = remaining !== null && remaining < 0;
  const number = (value: number | null | undefined) => formatNutritionAmount(value) ?? '0';

  const macros = [
    {
      key: 'protein',
      label: copy.targets.protein,
      value: day.consumed.proteinG,
      target: day.targets.proteinG ?? null,
      tone: 'stroke-chart-1',
    },
    {
      key: 'carbs',
      label: copy.targets.carbs,
      value: day.consumed.carbohydratesG,
      target: day.targets.carbohydratesG ?? null,
      tone: 'stroke-chart-2',
    },
    {
      key: 'fat',
      label: copy.targets.fat,
      value: day.consumed.fatG,
      target: day.targets.fatG ?? null,
      tone: 'stroke-chart-3',
    },
  ];

  return (
    <section className="client-surface-card space-y-5" aria-labelledby="journal-summary-heading">
      <h2 id="journal-summary-heading" className="sr-only">
        {copy.targets.title}
      </h2>
      <div className="flex items-center gap-5">
        <div
          className="relative size-32 shrink-0"
          role="meter"
          aria-label={copy.targets.calories}
          aria-valuemin={0}
          aria-valuemax={target ?? 0}
          aria-valuenow={Math.round(consumed)}
        >
          <Ring
            value={percent(consumed, target)}
            size={120}
            stroke={11}
            className={over ? 'stroke-danger' : 'stroke-primary'}
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            {remaining !== null ? (
              <>
                <span
                  className={cn(
                    'text-numeric text-2xl font-semibold tracking-tight',
                    over ? 'text-danger' : 'text-primary',
                  )}
                >
                  {number(Math.round(Math.abs(remaining)))}
                </span>
                <span className="text-xs text-muted-foreground">
                  {over ? copy.journal.over : copy.journal.remaining}
                </span>
              </>
            ) : (
              <span className="px-3 text-xs text-muted-foreground">{copy.journal.noTarget}</span>
            )}
          </div>
        </div>
        <dl className="min-w-0 flex-1 space-y-2.5">
          <div className="flex items-baseline justify-between gap-2">
            <dt className="text-sm text-muted-foreground">{copy.journal.target}</dt>
            <dd className="text-numeric text-lg font-semibold">
              {target === null ? copy.food.unknown : number(target)}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <dt className="text-sm text-muted-foreground">{copy.journal.eaten}</dt>
            <dd className="text-numeric text-lg font-semibold">{number(consumed)}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <dt className="text-sm text-muted-foreground">{copy.journal.planned}</dt>
            <dd className="text-numeric text-lg font-semibold">{number(day.planned.caloriesKcal)}</dd>
          </div>
        </dl>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {macros.map((macro) => (
          <div key={macro.key} className="flex min-w-0 flex-col items-center gap-1.5 text-center">
            <div className="size-12">
              <Ring value={percent(macro.value, macro.target)} size={48} stroke={6} className={macro.tone} />
            </div>
            <p className="text-xs font-medium text-muted-foreground">{macro.label}</p>
            <p className="text-numeric text-xs text-foreground">
              {macro.target === null
                ? `${number(macro.value)} g`
                : interpolate(copy.journal.macroOf, {
                    value: `${number(macro.value)}`,
                    target: `${number(macro.target)} g`,
                  })}
            </p>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{copy.journal.targetFromCoach}</p>
    </section>
  );
}
