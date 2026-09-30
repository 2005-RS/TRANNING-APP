import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  NutritionFoodNutritionPer100gDto,
  PaginationMetaDto,
} from '../../nutrition-foods/dto/nutrition-food-response.dto';
import { NutritionFoodSource } from '../../nutrition-foods/enums/nutrition-food-source.enum';
import { NutritionFoodVisibility } from '../../nutrition-foods/enums/nutrition-food-visibility.enum';
import {
  NUTRITION_FOOD_BRAND_MAX_LENGTH,
  NUTRITION_FOOD_NAME_MAX_LENGTH,
  NUTRITION_FOOD_NAME_MIN_LENGTH,
  NUTRITION_FOOD_PORTION_GRAMS_MAX,
  NUTRITION_FOOD_PORTION_GRAMS_MIN,
  NUTRITION_FOOD_PORTION_LABEL_MAX_LENGTH,
} from '../../nutrition-foods/nutrition-foods.constants';
import { normalizeFoodName } from '../../nutrition-foods/nutrition-food-text.util';
import {
  CLIENT_FOOD_LIST_DEFAULT_LIMIT,
  CLIENT_FOOD_LIST_MAX_LIMIT,
  CLIENT_FOOD_SEARCH_MAX_LENGTH,
} from '../nutrition-journal.constants';

export enum ClientFoodScope {
  ALL = 'ALL',
  PLAN = 'PLAN',
  RECENT = 'RECENT',
}

export class ListClientFoodsQueryDto {
  @ApiPropertyOptional({ maxLength: CLIENT_FOOD_SEARCH_MAX_LENGTH })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(CLIENT_FOOD_SEARCH_MAX_LENGTH)
  search?: string;

  @ApiPropertyOptional({ enum: ClientFoodScope, default: ClientFoodScope.ALL })
  @IsOptional()
  @IsEnum(ClientFoodScope)
  scope?: ClientFoodScope;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    default: CLIENT_FOOD_LIST_DEFAULT_LIMIT,
    minimum: 1,
    maximum: CLIENT_FOOD_LIST_MAX_LIMIT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(CLIENT_FOOD_LIST_MAX_LIMIT)
  limit?: number;
}

export class ClientFoodPortionSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: '1 egg' })
  label!: string;

  @ApiProperty({ example: 50 })
  gramWeight!: number;

  @ApiProperty({ example: 72 })
  caloriesKcal!: number;
}

export class ClientFoodSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  brand!: string | null;

  @ApiProperty({ enum: NutritionFoodSource })
  source!: NutritionFoodSource;

  @ApiProperty({ enum: NutritionFoodVisibility })
  visibility!: NutritionFoodVisibility;

  @ApiProperty({ description: 'Created by this Client (private).' })
  isOwn!: boolean;

  @ApiProperty({ description: 'Part of the Client’s plan for today.' })
  inPlan!: boolean;

  @ApiProperty({ type: NutritionFoodNutritionPer100gDto })
  nutritionPer100g!: NutritionFoodNutritionPer100gDto;

  @ApiPropertyOptional({ type: ClientFoodPortionSummaryDto, nullable: true })
  defaultPortion!: ClientFoodPortionSummaryDto | null;
}

export class PaginatedClientFoodsResponseDto {
  @ApiProperty({ type: [ClientFoodSummaryDto] })
  data!: ClientFoodSummaryDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}

/** A Client's own food, entered as printed on a label: values per portion. */
export class CreateClientFoodDto {
  @ApiProperty({
    minLength: NUTRITION_FOOD_NAME_MIN_LENGTH,
    maxLength: NUTRITION_FOOD_NAME_MAX_LENGTH,
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? normalizeFoodName(value) : value,
  )
  @IsString()
  @MinLength(NUTRITION_FOOD_NAME_MIN_LENGTH)
  @MaxLength(NUTRITION_FOOD_NAME_MAX_LENGTH)
  name!: string;

  @ApiPropertyOptional({
    nullable: true,
    type: String,
    maxLength: NUTRITION_FOOD_BRAND_MAX_LENGTH,
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() || null : value,
  )
  @IsString()
  @MaxLength(NUTRITION_FOOD_BRAND_MAX_LENGTH)
  brand?: string | null;

  @ApiPropertyOptional({
    example: '1 bar',
    maxLength: NUTRITION_FOOD_PORTION_LABEL_MAX_LENGTH,
    description: 'Defaults to "{portionGrams} g".',
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() || undefined : value,
  )
  @IsString()
  @MaxLength(NUTRITION_FOOD_PORTION_LABEL_MAX_LENGTH)
  portionLabel?: string;

  @ApiProperty({
    example: 100,
    minimum: NUTRITION_FOOD_PORTION_GRAMS_MIN,
    maximum: NUTRITION_FOOD_PORTION_GRAMS_MAX,
    description: 'Grams in the portion the values below refer to.',
  })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(NUTRITION_FOOD_PORTION_GRAMS_MIN)
  @Max(NUTRITION_FOOD_PORTION_GRAMS_MAX)
  portionGrams!: number;

  @ApiProperty({ minimum: 0, maximum: 10_000 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(10_000)
  caloriesKcal!: number;

  @ApiProperty({ minimum: 0, maximum: 1_000 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1_000)
  proteinG!: number;

  @ApiProperty({ minimum: 0, maximum: 1_000 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1_000)
  carbohydratesG!: number;

  @ApiProperty({ minimum: 0, maximum: 1_000 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1_000)
  fatG!: number;

  @ApiPropertyOptional({
    nullable: true,
    type: Number,
    minimum: 0,
    maximum: 1_000,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1_000)
  fiberG?: number | null;
}
