export function normalizeFoodName(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function optionalPlainText(
  value: string | null | undefined,
): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = value.trim().replace(/\s+/g, ' ');
  return trimmed.length === 0 ? null : trimmed;
}
