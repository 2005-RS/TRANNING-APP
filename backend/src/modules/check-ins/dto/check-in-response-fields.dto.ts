import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import {
  CHECK_IN_ADHERENCE_MAX,
  CHECK_IN_ADHERENCE_MIN,
  CHECK_IN_RATING_MAX,
  CHECK_IN_RATING_MIN,
  CHECK_IN_RESPONSE_TEXT_MAX_LENGTH,
} from '../check-ins.constants';
import { ToNullableNumber } from '../transform.util';

const RATING_DESCRIPTION =
  'Subjective Client self-rating from 1 (lower self-rating) to 5 (higher self-rating). Not a medical assessment.';

function OptionalRating() {
  return function (target: object, propertyName: string): void {
    ApiPropertyOptional({
      nullable: true,
      minimum: CHECK_IN_RATING_MIN,
      maximum: CHECK_IN_RATING_MAX,
      example: 4,
      description: RATING_DESCRIPTION,
    })(target, propertyName);
    IsOptional()(target, propertyName);
    ValidateIf((_, value) => value !== null)(target, propertyName);
    ToNullableNumber()(target, propertyName);
    IsInt()(target, propertyName);
    Min(CHECK_IN_RATING_MIN)(target, propertyName);
    Max(CHECK_IN_RATING_MAX)(target, propertyName);
  };
}

function OptionalAdherence() {
  return function (target: object, propertyName: string): void {
    ApiPropertyOptional({
      nullable: true,
      minimum: CHECK_IN_ADHERENCE_MIN,
      maximum: CHECK_IN_ADHERENCE_MAX,
      example: 90,
      description:
        'Optional Client self-reported adherence percentage (0–100). Not calculated from WorkoutSessions or NutritionPlans.',
    })(target, propertyName);
    IsOptional()(target, propertyName);
    ValidateIf((_, value) => value !== null)(target, propertyName);
    ToNullableNumber()(target, propertyName);
    IsInt()(target, propertyName);
    Min(CHECK_IN_ADHERENCE_MIN)(target, propertyName);
    Max(CHECK_IN_ADHERENCE_MAX)(target, propertyName);
  };
}

function OptionalResponseText() {
  return function (target: object, propertyName: string): void {
    ApiPropertyOptional({
      nullable: true,
      maxLength: CHECK_IN_RESPONSE_TEXT_MAX_LENGTH,
      description:
        'Optional plain text. Whitespace-only values are stored as null. Paragraph formatting is preserved.',
    })(target, propertyName);
    IsOptional()(target, propertyName);
    ValidateIf((_, value) => value !== null)(target, propertyName);
    IsString()(target, propertyName);
    MaxLength(CHECK_IN_RESPONSE_TEXT_MAX_LENGTH)(target, propertyName);
  };
}

export class CheckInResponseFieldsDto {
  @OptionalRating()
  sleepQuality?: number | null;

  @OptionalRating()
  energyLevel?: number | null;

  @OptionalRating()
  stressLevel?: number | null;

  @OptionalRating()
  hungerLevel?: number | null;

  @OptionalRating()
  recoveryLevel?: number | null;

  @OptionalAdherence()
  trainingAdherencePct?: number | null;

  @OptionalAdherence()
  nutritionAdherencePct?: number | null;

  @OptionalResponseText()
  wins?: string | null;

  @OptionalResponseText()
  challenges?: string | null;

  @OptionalResponseText()
  generalNotes?: string | null;
}
