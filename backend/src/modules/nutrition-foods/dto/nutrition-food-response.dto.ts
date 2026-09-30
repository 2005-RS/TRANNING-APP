import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FoodNutrientDerivation } from '../enums/food-nutrient-derivation.enum';
import { NutritionFoodNameOrigin } from '../enums/nutrition-food-name-origin.enum';
import { NutritionFoodSource } from '../enums/nutrition-food-source.enum';
import { NutrientCategory } from '../../nutrition-nutrients/enums/nutrient-category.enum';
import { NutrientUnit } from '../../nutrition-nutrients/enums/nutrient-unit.enum';
import { NutritionFoodStatus } from '../enums/nutrition-food-status.enum';
import { NutritionFoodVisibility } from '../enums/nutrition-food-visibility.enum';

export class FoodPortionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: '1 egg' })
  label!: string;

  @ApiProperty({
    example: 50,
    description: 'Grams in one unit of this portion.',
  })
  gramWeight!: number;

  @ApiProperty({
    description: 'The portion shown first when logging or searching.',
  })
  isDefault!: boolean;
}

export class NutritionFoodNutritionPer100gDto {
  @ApiProperty({ example: 165 })
  caloriesKcal!: number;

  @ApiProperty({ example: 31 })
  proteinG!: number;

  @ApiProperty({ example: 0 })
  carbohydratesG!: number;

  @ApiProperty({ example: 3.6 })
  fatG!: number;

  @ApiPropertyOptional({ nullable: true, type: Number, example: 0 })
  fiberG!: number | null;
}

export class NutritionFoodNutrientResponseDto {
  @ApiProperty({ example: 'sodium_mg' })
  code!: string;

  @ApiProperty({ example: 'Sodium' })
  nameEn!: string;

  @ApiProperty({ example: 'Sodio' })
  nameEs!: string;

  @ApiProperty({ enum: NutrientUnit })
  unit!: NutrientUnit;

  @ApiProperty({ enum: NutrientCategory })
  category!: NutrientCategory;

  @ApiPropertyOptional({ nullable: true, type: Number })
  amountPer100g!: number | null;

  @ApiProperty({ enum: FoodNutrientDerivation })
  derivation!: FoodNutrientDerivation;

  @ApiProperty({ enum: NutritionFoodSource })
  source!: NutritionFoodSource;
}

export class NutritionFoodResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 'Chicken Breast' })
  name!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  brand!: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  description!: string | null;

  @ApiProperty({ enum: NutritionFoodSource })
  source!: NutritionFoodSource;

  @ApiPropertyOptional({ nullable: true, type: String })
  externalId!: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  sourceDataType!: string | null;

  @ApiPropertyOptional({ nullable: true, type: Date })
  importedAt!: Date | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  nameOriginal!: string | null;

  @ApiProperty({ enum: NutritionFoodNameOrigin })
  nameOrigin!: NutritionFoodNameOrigin;

  @ApiPropertyOptional({ nullable: true, type: Date })
  nameVerifiedAt!: Date | null;

  @ApiProperty({ type: NutritionFoodNutritionPer100gDto })
  nutritionPer100g!: NutritionFoodNutritionPer100gDto;

  @ApiProperty({ type: [NutritionFoodNutrientResponseDto] })
  nutrients!: NutritionFoodNutrientResponseDto[];

  @ApiProperty({
    type: [FoodPortionResponseDto],
    description:
      'Household measures, ordered. Grams (and ml with density) are always available.',
  })
  portions!: FoodPortionResponseDto[];

  @ApiProperty({ enum: NutritionFoodStatus })
  status!: NutritionFoodStatus;

  @ApiProperty({ enum: NutritionFoodVisibility })
  visibility!: NutritionFoodVisibility;

  @ApiProperty()
  createdByUserId!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class PaginationMetaDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  totalItems!: number;

  @ApiProperty()
  totalPages!: number;
}

export class PaginatedNutritionFoodsResponseDto {
  @ApiProperty({ type: [NutritionFoodResponseDto] })
  data!: NutritionFoodResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}
