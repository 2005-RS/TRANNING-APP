import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { NutritionMealType } from '../../nutrition-plans/enums/nutrition-meal-type.enum';
import {
  JOURNAL_GRAMS_MAX,
  JOURNAL_GRAMS_MIN,
  JOURNAL_NOTE_MAX_LENGTH,
  JOURNAL_PORTION_QUANTITY_MAX,
  JOURNAL_PORTION_QUANTITY_MIN,
} from '../nutrition-journal.constants';

const trimOrNull = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() || null : value;

/**
 * Amount is either `grams`, or `portionId` + `portionQuantity` (e.g. 2 × "1 egg").
 * Exactly one form must be given.
 */
class JournalAmountDto {
  @ApiPropertyOptional({
    minimum: JOURNAL_GRAMS_MIN,
    maximum: JOURNAL_GRAMS_MAX,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(JOURNAL_GRAMS_MIN)
  @Max(JOURNAL_GRAMS_MAX)
  grams?: number;

  @ApiPropertyOptional({ description: 'A portion of the chosen food.' })
  @IsOptional()
  @IsUUID('4')
  portionId?: string;

  @ApiPropertyOptional({
    minimum: JOURNAL_PORTION_QUANTITY_MIN,
    maximum: JOURNAL_PORTION_QUANTITY_MAX,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(JOURNAL_PORTION_QUANTITY_MIN)
  @Max(JOURNAL_PORTION_QUANTITY_MAX)
  portionQuantity?: number;
}

export class CreateJournalEntryDto extends JournalAmountDto {
  @ApiProperty({ enum: NutritionMealType })
  @IsEnum(NutritionMealType)
  mealType!: NutritionMealType;

  @ApiProperty()
  @IsUUID('4')
  foodId!: string;

  @ApiPropertyOptional({
    description:
      'When set, this entry replaces that prescribed item for the day ("changed to").',
  })
  @IsOptional()
  @IsUUID('4')
  planItemId?: string;

  @ApiPropertyOptional({
    maxLength: JOURNAL_NOTE_MAX_LENGTH,
    nullable: true,
    type: String,
  })
  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  @MaxLength(JOURNAL_NOTE_MAX_LENGTH)
  note?: string | null;
}

export class UpdateJournalEntryDto extends JournalAmountDto {
  @ApiPropertyOptional({ enum: NutritionMealType })
  @IsOptional()
  @IsEnum(NutritionMealType)
  mealType?: NutritionMealType;

  @ApiPropertyOptional({
    maxLength: JOURNAL_NOTE_MAX_LENGTH,
    nullable: true,
    type: String,
  })
  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  @MaxLength(JOURNAL_NOTE_MAX_LENGTH)
  note?: string | null;
}
