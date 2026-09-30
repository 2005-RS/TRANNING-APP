export type NutrientCode = string;

export type NutrientVector = Record<NutrientCode, number | null>;

export type Completeness = {
  complete: boolean;
  missing: NutrientCode[];
};

export function scalePer100(
  per100: NutrientVector,
  grams: number,
): NutrientVector {
  return Object.fromEntries(
    Object.entries(per100).map(([code, amount]) => [
      code,
      amount === null ? null : (Number(amount) * Number(grams)) / 100,
    ]),
  );
}

export function sumVectors(vectors: NutrientVector[]): {
  totals: NutrientVector;
  completeness: Completeness;
} {
  const codes = [...new Set(vectors.flatMap((vector) => Object.keys(vector)))];
  const totals: NutrientVector = {};
  const missing: NutrientCode[] = [];

  for (const code of codes) {
    // Coerce: Postgres decimals can arrive as strings; `+` must never concatenate.
    const values = vectors.map((vector) =>
      vector[code] === null || vector[code] === undefined
        ? null
        : Number(vector[code]),
    );
    const known = values.filter((value): value is number => value !== null);
    const hasUnknown = values.some((value) => value === null);

    totals[code] =
      known.length === 0 ? null : known.reduce((sum, value) => sum + value, 0);
    if (hasUnknown) {
      missing.push(code);
    }
  }

  return {
    totals,
    completeness: {
      complete: missing.length === 0,
      missing,
    },
  };
}

export function roundNutrient(value: number): number {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}
