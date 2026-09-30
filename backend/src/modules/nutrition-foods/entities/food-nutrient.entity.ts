import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Nutrient } from '../../nutrition-nutrients/entities/nutrient.entity';
import { User } from '../../users/entities/user.entity';
import { FoodNutrientDerivation } from '../enums/food-nutrient-derivation.enum';
import { NutritionFoodSource } from '../enums/nutrition-food-source.enum';
import { numericTransformer } from '../numeric.transformer';
import { NutritionFood } from './nutrition-food.entity';

@Entity({ name: 'food_nutrients' })
export class FoodNutrient {
  @PrimaryColumn({ name: 'food_id', type: 'uuid' })
  foodId!: string;

  @PrimaryColumn({ name: 'nutrient_id', type: 'uuid' })
  nutrientId!: string;

  @ManyToOne(() => NutritionFood, (food) => food.foodNutrients, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'food_id' })
  food!: NutritionFood;

  @ManyToOne(() => Nutrient, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'nutrient_id' })
  nutrient!: Nutrient;

  @Column({
    name: 'amount_per_100g',
    type: 'numeric',
    precision: 12,
    scale: 4,
    nullable: true,
    transformer: numericTransformer,
  })
  amountPer100g!: number | null;

  @Column({
    type: 'enum',
    enum: FoodNutrientDerivation,
    enumName: 'food_nutrient_derivation',
    default: FoodNutrientDerivation.MEASURED,
  })
  derivation!: FoodNutrientDerivation;

  @Column({
    type: 'enum',
    enum: NutritionFoodSource,
    enumName: 'nutrition_food_source',
    default: NutritionFoodSource.MANUAL,
  })
  source!: NutritionFoodSource;

  @Column({
    name: 'source_nutrient_ref',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  sourceNutrientRef!: string | null;

  @Column({ name: 'updated_by_user_id', type: 'uuid', nullable: true })
  updatedByUserId!: string | null;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'updated_by_user_id' })
  updatedByUser!: User | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
