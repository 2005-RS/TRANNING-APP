import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { NutritionMealType } from '../enums/nutrition-meal-type.enum';
import { NutritionPlan } from './nutrition-plan.entity';
import { NutritionPlanMealItem } from './nutrition-plan-meal-item.entity';

@Entity({ name: 'nutrition_plan_meals' })
export class NutritionPlanMeal {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'nutrition_plan_id', type: 'uuid' })
  nutritionPlanId!: string;

  @ManyToOne(() => NutritionPlan, (plan) => plan.meals, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'nutrition_plan_id' })
  nutritionPlan!: NutritionPlan;

  @Column({ type: 'varchar', length: 150 })
  name!: string;

  @Column({
    name: 'meal_type',
    type: 'enum',
    enum: NutritionMealType,
    enumName: 'nutrition_meal_type',
  })
  mealType!: NutritionMealType;

  @Column({ type: 'int' })
  position!: number;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  notes!: string | null;

  @OneToMany(() => NutritionPlanMealItem, (item) => item.meal)
  items!: NutritionPlanMealItem[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
