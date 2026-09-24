import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { BODY_METRIC_FIELDS } from './body-measurements.constants';
import { hasAtLeastOneMetric } from './body-measurements.metrics';

@ValidatorConstraint({ name: 'hasAtLeastOneBodyMetric', async: false })
export class HasAtLeastOneBodyMetricConstraint implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments): boolean {
    const source =
      typeof args.object === 'object' && args.object !== null
        ? args.object
        : _value;
    return hasAtLeastOneMetric(source as Record<string, number | null>);
  }

  defaultMessage(): string {
    return `At least one body metric is required (${BODY_METRIC_FIELDS.join(', ')})`;
  }
}
