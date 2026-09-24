import { cn } from '@/shared/lib/utils';

const RATINGS = [1, 2, 3, 4, 5] as const;

export function RatingScale({
  id,
  label,
  hint,
  value,
  onChange,
  disabled = false,
  invalid = false,
  errorId,
}: {
  id: string;
  label: string;
  hint: string;
  value: number | null;
  onChange: (value: number | null) => void;
  disabled?: boolean;
  invalid?: boolean;
  errorId?: string;
}) {
  const hintId = `${id}-hint`;

  return (
    <fieldset
      className="space-y-2"
      aria-describedby={errorId ? `${hintId} ${errorId}` : hintId}
      aria-invalid={invalid || undefined}
    >
      <legend className="text-sm font-medium text-foreground">{label}</legend>
      <p id={hintId} className="sr-only">
        {hint}
      </p>
      <div className="grid grid-cols-5 overflow-hidden rounded-xl border border-border">
        {RATINGS.map((rating, index) => {
          const selected = value === rating;
          return (
            <button
              key={rating}
              type="button"
              disabled={disabled}
              aria-pressed={selected}
              aria-label={`${label} ${rating}`}
              className={cn(
                'min-h-12 font-mono text-base tabular-nums',
                'focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                index > 0 && 'border-l border-border',
                selected
                  ? 'bg-primary/15 text-foreground'
                  : 'bg-background text-muted-foreground',
                disabled && 'cursor-not-allowed opacity-50',
              )}
              onClick={() => onChange(selected ? null : rating)}
            >
              {rating}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
