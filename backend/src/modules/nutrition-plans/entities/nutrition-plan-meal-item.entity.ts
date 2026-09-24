import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { NutritionFood } from '../../nutrition-foods/entities/nutrition-food.entity';
import { numericTransformer } from '../numeric.transformer';
import { NutritionPlanMeal } from './nutrition-plan-meal.entity';

@Entity({ name: 'nutrition_plan_meal_items' })
export class NutritionPlanMealItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'nutrition_plan_meal_id', type: 'uuid' })
  nutritionPlanMealId!: string;

  @ManyToOne(() => NutritionPlanMeal, (meal) => meal.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'nutrition_plan_meal_id' })
  meal!: NutritionPlanMeal;

  @Column({ name: 'source_food_id', type: 'uuid' })
  sourceFoodId!: string;

  @ManyToOne(() => NutritionFood, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'source_food_id' })
  sourceFood!: NutritionFood;

  @Column({ name: 'food_name_snapshot', type: 'varchar', length: 150 })
  foodNameSnapshot!: string;

  @Column({
    name: 'brand_snapshot',
    type: 'varchar',
    length: 150,
    nullable: true,
  })
  brandSnapshot!: string | null;

  @Column({
    name: 'quantity_grams',
    type: 'numeric',
    precision: 8,
    scale: 2,
    transformer: numericTransformer,
  })
  quantityGrams!: number;

  @Column({
    name: 'calories_per_100g_snapshot',
    type: 'numeric',
    precision: 7,
    scale: 2,
    transformer: numericTransformer,
  })
  caloriesPer100gSnapshot!: number;

  @Column({
    name: 'protein_g_per_100g_snapshot',
    type: 'numeric',
    precision: 6,
    scale: 2,
    transformer: numericTransformer,
  })
  proteinGPer100gSnapshot!: number;

  @Column({
    name: 'carbohydrates_g_per_100g_snapshot',
    type: 'numeric',
    precision: 6,
    scale: 2,
    transformer: numericTransformer,
  })
  carbohydratesGPer100gSnapshot!: number;

  @Column({
    name: 'fat_g_per_100g_snapshot',
    type: 'numeric',
    precision: 6,
    scale: 2,
    transformer: numericTransformer,
  })
  fatGPer100gSnapshot!: number;

  @Column({
    name: 'fiber_g_per_100g_snapshot',
    type: 'numeric',
    precision: 6,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  fiberGPer100gSnapshot!: number | null;

  @Column({ type: 'int' })
  position!: number;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
