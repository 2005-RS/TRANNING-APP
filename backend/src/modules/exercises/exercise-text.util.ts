export function normalizeExerciseName(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function optionalPlainText(
  value: string | null | undefined,
): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}
