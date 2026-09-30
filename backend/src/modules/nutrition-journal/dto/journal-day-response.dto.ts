import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NutritionMealType } from '../../nutrition-plans/enums/nutrition-meal-type.enum';
import {
  FoodLogEntryStatus,
  PlannedItemStatus,
} from '../enums/food-log-entry-status.enum';

export class JournalMacrosDto {
  @ApiProperty({ example: 520.4 })
  caloriesKcal!: number;

  @ApiProperty({ example: 32.1 })
  proteinG!: number;

  @ApiProperty({ example: 60.2 })
  carbohydratesG!: number;

  @ApiProperty({ example: 14.8 })
  fatG!: number;

  @ApiProperty({ example: 6.3 })
  fiberG!: number;
}

export class JournalTargetsDto {
  @ApiPropertyOptional({ nullable: true, type: Number })
  caloriesKcal!: number | null;

  @ApiPropertyOptional({ nullable: true, type: Number })
  proteinG!: number | null;

  @ApiPropertyOptional({ nullable: true, type: Number })
  carbohydratesG!: number | null;

  @ApiPropertyOptional({ nullable: true, type: Number })
  fatG!: number | null;
}

export class JournalEntryNutritionDto {
  @ApiPropertyOptional({ nullable: true, type: Number })
  caloriesKcal!: number | null;

  @ApiPropertyOptional({ nullable: true, type: Number })
  proteinG!: number | null;

  @ApiPropertyOptional({ nullable: true, type: Number })
  carbohydratesG!: number | null;

  @ApiPropertyOptional({ nullable: true, type: Number })
  fatG!: number | null;

  @ApiPropertyOptional({ nullable: true, type: Number })
  fiberG!: number | null;
}

export class JournalEntryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: NutritionMealType })
  mealType!: NutritionMealType;

  @ApiProperty({ enum: FoodLogEntryStatus })
  status!: FoodLogEntryStatus;

  @ApiPropertyOptional({ nullable: true, type: String })
  planItemId!: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  foodId!: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  foodName!: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  brand!: string | null;

  @ApiPropertyOptional({ nullable: true, type: Number })
  grams!: number | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  portionLabel!: string | null;

  @ApiPropertyOptional({ nullable: true, type: Number })
  portionQuantity!: number | null;

  @ApiProperty({ type: JournalEntryNutritionDto })
  nutrition!: JournalEntryNutritionDto;

  @ApiPropertyOptional({ nullable: true, type: String })
  note!: string | null;

  @ApiProperty()
  loggedAt!: Date;
}

export class JournalPlannedItemDto {
  @ApiProperty()
  planItemId!: string;

  @ApiProperty({ example: 'Avena con yogur' })
  planMealName!: string;

  @ApiProperty()
  foodId!: string;

  @ApiProperty()
  foodName!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  brand!: string | null;

  @ApiProperty({ example: 80 })
  quantityGrams!: number;

  @ApiProperty({
    type: JournalEntryNutritionDto,
    description: 'Prescribed amount.',
  })
  nutrition!: JournalEntryNutritionDto;

  @ApiProperty({ enum: PlannedItemStatus })
  status!: PlannedItemStatus;

  @ApiPropertyOptional({
    type: JournalEntryDto,
    nullable: true,
    description:
      'What the Client logged for this item (eaten, replacement or skip).',
  })
  entry!: JournalEntryDto | null;
}

export class JournalMealDto {
  @ApiProperty({ enum: NutritionMealType })
  mealType!: NutritionMealType;

  @ApiProperty({ type: [JournalPlannedItemDto] })
  plannedItems!: JournalPlannedItemDto[];

  @ApiProperty({
    type: [JournalEntryDto],
    description: 'Food logged outside the plan for this meal.',
  })
  extraEntries!: JournalEntryDto[];

  @ApiProperty({ example: 582.9 })
  plannedCaloriesKcal!: number;

  @ApiProperty({ example: 420.2 })
  consumedCaloriesKcal!: number;
}

export class JournalAdherenceDto {
  @ApiProperty({ description: 'Prescribed items for the day.' })
  plannedItems!: number;

  @ApiProperty()
  eaten!: number;

  @ApiProperty()
  replaced!: number;

  @ApiProperty()
  skipped!: number;

  @ApiProperty()
  pending!: number;
}

export class JournalPlanRefDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;
}

export class JournalDayResponseDto {
  @ApiProperty({ example: '2026-09-30' })
  date!: string;

  @ApiPropertyOptional({
    type: JournalPlanRefDto,
    nullable: true,
    description: 'The ACTIVE plan that applies to this date, if any.',
  })
  plan!: JournalPlanRefDto | null;

  @ApiProperty({
    type: JournalTargetsDto,
    description: 'Prescribed by the professional. Clients cannot edit targets.',
  })
  targets!: JournalTargetsDto;

  @ApiProperty({
    type: JournalMacrosDto,
    description: 'Prescribed meal totals.',
  })
  planned!: JournalMacrosDto;

  @ApiProperty({
    type: JournalMacrosDto,
    description: 'Logged (eaten) totals.',
  })
  consumed!: JournalMacrosDto;

  @ApiPropertyOptional({
    nullable: true,
    type: Number,
    description:
      'Calorie target minus consumed. Null without a calorie target.',
  })
  remainingCaloriesKcal!: number | null;

  @ApiProperty({ type: JournalAdherenceDto })
  adherence!: JournalAdherenceDto;

  @ApiProperty({
    type: [JournalMealDto],
    description: 'Always all five meal types.',
  })
  meals!: JournalMealDto[];

  @ApiProperty({ description: 'Whether the viewer can log on this date.' })
  editable!: boolean;
}
