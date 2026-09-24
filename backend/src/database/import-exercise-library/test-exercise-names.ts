const DISPOSABLE_NAME =
  /^(minio\b|test\b|e2e\b|seed test\b|upload verify\b)|live verify|seed test|upload verify/i;

export function isDisposableTestExerciseName(name: string): boolean {
  const normalized = name.trim().replace(/\s+/g, ' ');
  if (normalized.length === 0) {
    return false;
  }
  return DISPOSABLE_NAME.test(normalized);
}
