import { Transform } from 'class-transformer';

export function ToOptionalBoolean() {
  return Transform(({ value }: { value: unknown }) => {
    if (value === true || value === 'true' || value === '1') {
      return true;
    }
    if (value === false || value === 'false' || value === '0') {
      return false;
    }
    return value;
  });
}
