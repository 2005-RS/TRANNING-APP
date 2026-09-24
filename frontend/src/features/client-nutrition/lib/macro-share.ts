import { finiteNumber } from '@/features/client-nutrition/lib/finite-number';

export type MacroShare = {
  protein: number | null;
  carbohydrates: number | null;
  fat: number | null;
  total: number;
};

export function macroShare(input: {
  proteinG?: number | null;
  carbohydratesG?: number | null;
  fatG?: number | null;
}): MacroShare | null {
  const protein = finiteNumber(input.proteinG);
  const carbohydrates = finiteNumber(input.carbohydratesG);
  const fat = finiteNumber(input.fatG);
  const present = [protein, carbohydrates, fat].filter((value): value is number => value !== null);
  if (present.length < 2) {
    return null;
  }
  const total = present.reduce((sum, value) => sum + value, 0);
  if (total <= 0) {
    return null;
  }
  return { protein, carbohydrates, fat, total };
}

export function sharePercent(part: number | null, total: number): number | null {
  if (part === null || total <= 0) {
    return null;
  }
  return (part / total) * 100;
}
