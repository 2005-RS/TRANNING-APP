import { ApiHideProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  Validate,
  ValidateIf,
} from 'class-validator';
import { IsStrictIsoDate } from '../../clients/iso-date.validators';
import {
  BODY_MEASUREMENT_CIRCUMFERENCE_MAX,
  BODY_MEASUREMENT_CIRCUMFERENCE_MIN,
  BODY_MEASUREMENT_FAT_MAX,
  BODY_MEASUREMENT_FAT_MIN,
  BODY_MEASUREMENT_LIST_DEFAULT_LIMIT,
  BODY_MEASUREMENT_LIST_DEFAULT_PAGE,
  BODY_MEASUREMENT_LIST_MAX_LIMIT,
  BODY_MEASUREMENT_NOTES_MAX_LENGTH,
  BODY_MEASUREMENT_WEIGHT_MAX,
  BODY_MEASUREMENT_WEIGHT_MIN,
} from '../body-measurements.constants';
import { HasAtLeastOneBodyMetricConstraint } from '../has-at-least-one-body-metric.decorator';
import { IsStrictIsoDateTime } from '../iso-datetime.validators';
import { ToNullableNumber, ToOptionalBoolean } from '../transform.util';

function OptionalWeight() {
  return function (target: object, propertyName: string): void {
    ApiPropertyOptional({
      nullable: true,
      example: 82.4,
      description: 'Canonical kilograms. Technical bounds only, not medical.',
    })(target, propertyName);
    IsOptional()(target, propertyName);
    ValidateIf((_, value) => value !== null)(target, propertyName);
    ToNullableNumber()(target, propertyName);
    IsNumber({ maxDecimalPlaces: 2 })(target, propertyName);
    Min(BODY_MEASUREMENT_WEIGHT_MIN)(target, propertyName);
    Max(BODY_MEASUREMENT_WEIGHT_MAX)(target, propertyName);
  };
}

function OptionalFat() {
  return function (target: object, propertyName: string): void {
    ApiPropertyOptional({
      nullable: true,
      example: 16.5,
      description:
        'Body-fat percentage as recorded by the Client. Not estimated.',
    })(target, propertyName);
    IsOptional()(target, propertyName);
    ValidateIf((_, value) => value !== null)(target, propertyName);
    ToNullableNumber()(target, propertyName);
    IsNumber({ maxDecimalPlaces: 2 })(target, propertyName);
    Min(BODY_MEASUREMENT_FAT_MIN)(target, propertyName);
    Max(BODY_MEASUREMENT_FAT_MAX)(target, propertyName);
  };
}

function OptionalCm(example: number) {
  return function (target: object, propertyName: string): void {
    ApiPropertyOptional({
      nullable: true,
      example,
      description: 'Canonical centimeters. Technical bounds only, not medical.',
    })(target, propertyName);
    IsOptional()(target, propertyName);
    ValidateIf((_, value) => value !== null)(target, propertyName);
    ToNullableNumber()(target, propertyName);
    IsNumber({ maxDecimalPlaces: 2 })(target, propertyName);
    Min(BODY_MEASUREMENT_CIRCUMFERENCE_MIN)(target, propertyName);
    Max(BODY_MEASUREMENT_CIRCUMFERENCE_MAX)(target, propertyName);
  };
}

export class BodyMeasurementMetricsDto {
  @OptionalWeight()
  bodyWeightKg?: number | null;

  @OptionalFat()
  bodyFatPercentage?: number | null;

  @OptionalCm(38)
  neckCm?: number | null;

  @OptionalCm(110)
  shouldersCm?: number | null;

  @OptionalCm(100)
  chestCm?: number | null;

  @OptionalCm(84.2)
  waistCm?: number | null;

  @OptionalCm(95)
  hipsCm?: number | null;

  @OptionalCm(35)
  leftArmCm?: number | null;

  @OptionalCm(35)
  rightArmCm?: number | null;

  @OptionalCm(55)
  leftThighCm?: number | null;

  @OptionalCm(55)
  rightThighCm?: number | null;

  @OptionalCm(38)
  leftCalfCm?: number | null;

  @OptionalCm(38)
  rightCalfCm?: number | null;
}

export class CreateBodyMeasurementDto extends BodyMeasurementMetricsDto {
  @ApiHideProperty()
  @Validate(HasAtLeastOneBodyMetricConstraint)
  requireAtLeastOneMetric?: true;

  @ApiPropertyOptional({
    example: '2026-08-01T12:00:00.000Z',
    description:
      'When the Client recorded the measurement. ISO-8601 with timezone. Omitted values default to server UTC now. Historical backdating is allowed. Values more than 5 minutes in the future are rejected.',
  })
  @IsOptional()
  @IsStrictIsoDateTime()
  measuredAt?: string;

  @ApiPropertyOptional({
    nullable: true,
    maxLength: BODY_MEASUREMENT_NOTES_MAX_LENGTH,
    description: 'Optional plain text. Notes alone are not a measurement.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(BODY_MEASUREMENT_NOTES_MAX_LENGTH)
  notes?: string | null;
}

export class UpdateBodyMeasurementDto extends BodyMeasurementMetricsDto {
  @ApiPropertyOptional({
    example: '2026-08-01T12:00:00.000Z',
    description:
      'Corrected observation time. ISO-8601 with timezone. Future values beyond 5 minutes of clock skew are rejected.',
  })
  @IsOptional()
  @IsStrictIsoDateTime()
  measuredAt?: string;

  @ApiPropertyOptional({
    nullable: true,
    maxLength: BODY_MEASUREMENT_NOTES_MAX_LENGTH,
  })
  @IsOptional()
  @IsString()
  @MaxLength(BODY_MEASUREMENT_NOTES_MAX_LENGTH)
  notes?: string | null;
}

export class ListBodyMeasurementsQueryDto {
  @ApiPropertyOptional({
    default: BODY_MEASUREMENT_LIST_DEFAULT_PAGE,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = BODY_MEASUREMENT_LIST_DEFAULT_PAGE;

  @ApiPropertyOptional({
    default: BODY_MEASUREMENT_LIST_DEFAULT_LIMIT,
    minimum: 1,
    maximum: BODY_MEASUREMENT_LIST_MAX_LIMIT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(BODY_MEASUREMENT_LIST_MAX_LIMIT)
  limit: number = BODY_MEASUREMENT_LIST_DEFAULT_LIMIT;

  @ApiPropertyOptional({
    example: '2026-08-01',
    description:
      'Inclusive UTC calendar day lower bound on measuredAt (YYYY-MM-DD).',
  })
  @IsOptional()
  @IsStrictIsoDate()
  dateFrom?: string;

  @ApiPropertyOptional({
    example: '2026-08-31',
    description:
      'Inclusive UTC calendar day upper bound on measuredAt (YYYY-MM-DD).',
  })
  @ValidateIf(
    (dto: ListBodyMeasurementsQueryDto) =>
      dto.dateTo !== undefined && dto.dateTo !== null,
  )
  @IsStrictIsoDate()
  dateTo?: string;

  @ApiPropertyOptional({
    description:
      'When true, only return rows where bodyWeightKg is present. Bodyweight history uses BodyMeasurement as the single source of truth.',
  })
  @IsOptional()
  @ToOptionalBoolean()
  @IsBoolean()
  hasBodyWeight?: boolean;
}
