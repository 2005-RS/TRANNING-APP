import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NutritionMealType } from '../enums/nutrition-meal-type.enum';
import { NutritionPlanStatus } from '../enums/nutrition-plan-status.enum';

export class NutritionTotalsDto {
  @ApiProperty({ example: 2685.5 })
  caloriesKcal!: number;

  @ApiProperty({ example: 178.4 })
  proteinG!: number;

  @ApiProperty({ example: 325.2 })
  carbohydratesG!: number;

  @ApiProperty({ example: 71.1 })
  fatG!: number;

  @ApiProperty({ example: 31.5 })
  fiberG!: number;
}

export class NutritionTargetsDto {
  @ApiPropertyOptional({ nullable: true, type: Number, example: 2700 })
  caloriesKcal!: number | null;

  @ApiPropertyOptional({ nullable: true, type: Number, example: 180 })
  proteinG!: number | null;

  @ApiPropertyOptional({ nullable: true, type: Number, example: 330 })
  carbohydratesG!: number | null;

  @ApiPropertyOptional({ nullable: true, type: Number, example: 70 })
  fatG!: number | null;
}

export class NutritionTargetDifferencesDto {
  @ApiPropertyOptional({
    nullable: true,
    type: Number,
    description:
      'mealPlanTotals.caloriesKcal - targets.caloriesKcal when a target exists.',
  })
  caloriesDifferenceKcal!: number | null;

  @ApiPropertyOptional({ nullable: true, type: Number })
  proteinDifferenceG!: number | null;

  @ApiPropertyOptional({ nullable: true, type: Number })
  carbohydratesDifferenceG!: number | null;

  @ApiPropertyOptional({ nullable: true, type: Number })
  fatDifferenceG!: number | null;
}

export class NutritionPlanMealItemNutritionDto {
  @ApiProperty({ example: 300 })
  caloriesKcal!: number;

  @ApiProperty({ example: 30 })
  proteinG!: number;

  @ApiProperty({ example: 45 })
  carbohydratesG!: number;

  @ApiProperty({ example: 7.5 })
  fatG!: number;

  @ApiPropertyOptional({ nullable: true, type: Number, example: 15 })
  fiberG!: number | null;
}

export class NutritionPlanMealItemResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({
    description: 'Provenance Food id. Display nutrition comes from snapshots.',
  })
  foodId!: string;

  @ApiProperty({ example: 'Oats' })
  foodName!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  brand!: string | null;

  @ApiProperty({ example: 80 })
  quantityGrams!: number;

  @ApiProperty({ type: NutritionPlanMealItemNutritionDto })
  nutrition!: NutritionPlanMealItemNutritionDto;

  @ApiProperty()
  position!: number;

  @ApiPropertyOptional({ nullable: true, type: String })
  notes!: string | null;
}

export class NutritionPlanMealResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 'Breakfast' })
  name!: string;

  @ApiProperty({ enum: NutritionMealType })
  mealType!: NutritionMealType;

  @ApiProperty()
  position!: number;

  @ApiPropertyOptional({ nullable: true, type: String })
  notes!: string | null;

  @ApiProperty({ type: NutritionTotalsDto })
  totals!: NutritionTotalsDto;

  @ApiProperty({ type: [NutritionPlanMealItemResponseDto] })
  items!: NutritionPlanMealItemResponseDto[];
}

export class NutritionPlanSummaryResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 'Hypertrophy Nutrition' })
  name!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  description!: string | null;

  @ApiProperty({ enum: NutritionPlanStatus })
  status!: NutritionPlanStatus;

  @ApiPropertyOptional({ nullable: true, type: String, example: '2026-09-01' })
  startDate!: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  endDate!: string | null;

  @ApiProperty({ type: NutritionTargetsDto })
  targets!: NutritionTargetsDto;

  @ApiProperty()
  clientProfileId!: string;

  @ApiProperty()
  createdByUserId!: string;

  @ApiPropertyOptional({ nullable: true, type: Date })
  activatedAt!: Date | null;

  @ApiPropertyOptional({ nullable: true, type: Date })
  archivedAt!: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class NutritionPlanResponseDto extends NutritionPlanSummaryResponseDto {
  @ApiProperty({
    type: NutritionTotalsDto,
    description:
      'Derived from snapshotted meal items. Independent of prescribed targets.',
  })
  mealPlanTotals!: NutritionTotalsDto;

  @ApiProperty({ type: NutritionTargetDifferencesDto })
  targetDifferences!: NutritionTargetDifferencesDto;

  @ApiProperty({ type: [NutritionPlanMealResponseDto] })
  meals!: NutritionPlanMealResponseDto[];
}

export class CurrentNutritionPlanResponseDto {
  @ApiPropertyOptional({
    type: NutritionPlanResponseDto,
    nullable: true,
  })
  nutritionPlan!: NutritionPlanResponseDto | null;
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

export class PaginatedNutritionPlansResponseDto {
  @ApiProperty({ type: [NutritionPlanSummaryResponseDto] })
  data!: NutritionPlanSummaryResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}
