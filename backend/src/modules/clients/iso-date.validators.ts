import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import { isNotFutureIsoDate, parseStrictIsoDate } from './iso-date.util';

export function IsStrictIsoDate(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string): void => {
    registerDecorator({
      name: 'isStrictIsoDate',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          return (
            typeof value === 'string' && parseStrictIsoDate(value) !== null
          );
        },
        defaultMessage(args: ValidationArguments): string {
          return `${args.property} must be a valid calendar date in YYYY-MM-DD format`;
        },
      },
    });
  };
}

export function IsNotFutureIsoDate(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string): void => {
    registerDecorator({
      name: 'isNotFutureIsoDate',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          return typeof value === 'string' && isNotFutureIsoDate(value);
        },
        defaultMessage(args: ValidationArguments): string {
          return `${args.property} must not be in the future`;
        },
      },
    });
  };
}
