import {
  roundNutrient,
  scalePer100 as scaleNutrientVectorPer100,
  sumVectors,
} from '../nutrition-engine';

export function roundNutrition(value: number): number {
  return roundNutrient(value);
}

export function scalePer100(per100g: number, quantityGrams: number): number {
  return roundNutrition(
    scaleNutrientVectorPer100({ value: per100g }, quantityGrams).value!,
  );
}

export function sumNutrition(values: number[]): number {
  const vectors = values.map((value) => ({ value }));
  return roundNutrition(sumVectors(vectors).totals.value ?? 0);
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
