import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NutritionFoodStatus } from '../enums/nutrition-food-status.enum';

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

export class NutritionFoodResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 'Chicken Breast' })
  name!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  brand!: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  description!: string | null;

  @ApiProperty({ type: NutritionFoodNutritionPer100gDto })
  nutritionPer100g!: NutritionFoodNutritionPer100gDto;

  @ApiProperty({ enum: NutritionFoodStatus })
  status!: NutritionFoodStatus;

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
