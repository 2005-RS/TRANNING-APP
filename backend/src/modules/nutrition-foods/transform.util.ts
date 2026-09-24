import { Transform } from 'class-transformer';

export function ToNullableNumber() {
  return Transform(({ value }: { value: unknown }) => {
    if (value === null || value === undefined) {
      return value;
    }
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'string' && value.trim() !== '') {
      return Number(value);
    }
    return value;
  });
}
