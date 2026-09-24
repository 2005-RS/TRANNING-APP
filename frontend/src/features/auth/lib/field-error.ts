export function firstFieldError(errors: unknown[]): string | undefined {
  const first = errors[0];
  if (typeof first === 'string' && first.length > 0) {
    return first;
  }
  if (
    typeof first === 'object' &&
    first !== null &&
    'message' in first &&
    typeof (first as { message: unknown }).message === 'string'
  ) {
    return (first as { message: string }).message;
  }
  return undefined;
}
