/**
 * Deterministic nutrition math from plan-owned snapshots.
 * Totals are rounded to 2 decimal places after each scale and after sums
 * so API values never expose binary floating-point residue.
 */
export function roundNutrition(value: number): number {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

export function scalePer100(per100g: number, quantityGrams: number): number {
  return roundNutrition((Number(per100g) * Number(quantityGrams)) / 100);
}

export function sumNutrition(values: number[]): number {
  return roundNutrition(values.reduce((sum, value) => sum + Number(value), 0));
}

export function scaleNullablePer100(
  per100g: number | null,
  quantityGrams: number,
): number | null {
  if (per100g === null || per100g === undefined) {
    return null;
  }
  return scalePer100(per100g, quantityGrams);
}
