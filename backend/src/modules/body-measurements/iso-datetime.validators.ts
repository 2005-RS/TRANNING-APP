import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

const ISO_DATE_TIME =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/;

export function parseStrictIsoDateTime(value: string): Date | null {
  if (!ISO_DATE_TIME.test(value)) {
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function IsStrictIsoDateTime(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string): void => {
    registerDecorator({
      name: 'isStrictIsoDateTime',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          return (
            typeof value === 'string' && parseStrictIsoDateTime(value) !== null
          );
        },
        defaultMessage(args: ValidationArguments): string {
          return `${args.property} must be an ISO-8601 timestamp with a timezone offset`;
        },
      },
    });
  };
}
