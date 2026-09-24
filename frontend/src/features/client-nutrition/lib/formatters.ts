import { format, isValid, parseISO } from 'date-fns';
import { finiteNumber } from '@/features/client-nutrition/lib/finite-number';

const numberFormat = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 1,
});

export function formatNutritionAmount(value: unknown): string | null {
  const amount = finiteNumber(value);
  if (amount === null) {
    return null;
  }
  return numberFormat.format(amount);
}

export function formatKcal(value: unknown): string | null {
  const amount = formatNutritionAmount(value);
  return amount === null ? null : `${amount} kcal`;
}

export function formatGrams(value: unknown): string | null {
  const amount = formatNutritionAmount(value);
  return amount === null ? null : `${amount} g`;
}

export function formatPlanDate(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const parsed = parseISO(value);
  return isValid(parsed) ? format(parsed, 'd MMM yyyy') : null;
}

export function formatPlanDateRange(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
): string | null {
  const start = formatPlanDate(startDate);
  const end = formatPlanDate(endDate);
  if (start && end) {
    return `${start} – ${end}`;
  }
  if (start) {
    return `From ${start}`;
  }
  if (end) {
    return `Until ${end}`;
  }
  return null;
}

export function formatSignedKcal(value: unknown): string | null {
  const amount = finiteNumber(value);
  if (amount === null) {
    return null;
  }
  const formatted = formatKcal(Math.abs(amount));
  if (!formatted) {
    return null;
  }
  if (amount > 0) {
    return `+${formatted}`;
  }
  if (amount < 0) {
    return `−${formatted}`;
  }
  return formatted;
}

export function formatMealCount(count: number, meal: string, meals: string): string {
  const amount = formatNutritionAmount(count) ?? '0';
  return `${amount} ${count === 1 ? meal : meals}`;
}
