import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { NutritionFoodSource } from '../enums/nutrition-food-source.enum';
import { numericTransformer } from '../numeric.transformer';
import { NutritionFood } from './nutrition-food.entity';

/** A household measure of a food, resolved to grams ("1 egg" = 50 g). */
@Entity({ name: 'food_portions' })
export class FoodPortion {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'food_id', type: 'uuid' })
  foodId!: string;

  @ManyToOne(() => NutritionFood, (food) => food.portions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'food_id' })
  food!: NutritionFood;

  @Column({ type: 'varchar', length: 60 })
  label!: string;

  @Column({
    name: 'gram_weight',
    type: 'numeric',
    precision: 10,
    scale: 3,
    transformer: numericTransformer,
  })
  gramWeight!: number;

  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault!: boolean;

  @Column({ type: 'int' })
  position!: number;

  @Column({
    type: 'enum',
    enum: NutritionFoodSource,
    enumName: 'nutrition_food_source',
    default: NutritionFoodSource.MANUAL,
  })
  source!: NutritionFoodSource;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
