import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ClientProfile } from '../../clients/entities/client-profile.entity';
import { NutritionFood } from '../../nutrition-foods/entities/nutrition-food.entity';
import { numericTransformer } from '../../nutrition-foods/numeric.transformer';
import { NutritionPlanMealItem } from '../../nutrition-plans/entities/nutrition-plan-meal-item.entity';
import { NutritionMealType } from '../../nutrition-plans/enums/nutrition-meal-type.enum';
import { User } from '../../users/entities/user.entity';
import { FoodLogEntryStatus } from '../enums/food-log-entry-status.enum';

/**
 * One thing a Client ate (or a prescribed item they skipped) on a local date.
 * Nutrition is snapshotted at write time: later catalog or plan edits never
 * rewrite history.
 */
@Entity({ name: 'food_log_entries' })
export class FoodLogEntry {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'client_profile_id', type: 'uuid' })
  clientProfileId!: string;

  @ManyToOne(() => ClientProfile, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'client_profile_id' })
  clientProfile!: ClientProfile;

  /** The Client's local calendar date (YYYY-MM-DD), not a UTC instant. */
  @Column({ name: 'local_date', type: 'date' })
  localDate!: string;

  @Column({
    name: 'meal_type',
    type: 'enum',
    enum: NutritionMealType,
    enumName: 'nutrition_meal_type',
  })
  mealType!: NutritionMealType;

  @Column({
    type: 'enum',
    enum: FoodLogEntryStatus,
    enumName: 'food_log_entry_status',
  })
  status!: FoodLogEntryStatus;

  @Column({ name: 'plan_item_id', type: 'uuid', nullable: true })
  planItemId!: string | null;

  @ManyToOne(() => NutritionPlanMealItem, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'plan_item_id' })
  planItem!: NutritionPlanMealItem | null;

  @Column({ name: 'food_id', type: 'uuid', nullable: true })
  foodId!: string | null;

  @ManyToOne(() => NutritionFood, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'food_id' })
  food!: NutritionFood | null;

  @Column({
    name: 'food_name_snapshot',
    type: 'varchar',
    length: 150,
    nullable: true,
  })
  foodNameSnapshot!: string | null;

  @Column({
    name: 'brand_snapshot',
    type: 'varchar',
    length: 150,
    nullable: true,
  })
  brandSnapshot!: string | null;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  grams!: number | null;

  @Column({
    name: 'portion_label',
    type: 'varchar',
    length: 60,
    nullable: true,
  })
  portionLabel!: string | null;

  @Column({
    name: 'portion_quantity',
    type: 'numeric',
    precision: 10,
    scale: 3,
    nullable: true,
    transformer: numericTransformer,
  })
  portionQuantity!: number | null;

  @Column({
    name: 'calories_kcal',
    type: 'numeric',
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  caloriesKcal!: number | null;

  @Column({
    name: 'protein_g',
    type: 'numeric',
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  proteinG!: number | null;

  @Column({
    name: 'carbohydrates_g',
    type: 'numeric',
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  carbohydratesG!: number | null;

  @Column({
    name: 'fat_g',
    type: 'numeric',
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  fatG!: number | null;

  @Column({
    name: 'fiber_g',
    type: 'numeric',
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  fiberG!: number | null;

  /** Every catalog nutrient for this entry's amount: { code: amount | null }. */
  @Column({
    name: 'nutrients_snapshot',
    type: 'jsonb',
    default: () => "'{}'::jsonb",
  })
  nutrientsSnapshot!: Record<string, number | null>;

  @Column({ type: 'varchar', length: 500, nullable: true })
  note!: string | null;

  @Column({ name: 'logged_by_user_id', type: 'uuid' })
  loggedByUserId!: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'logged_by_user_id' })
  loggedByUser!: User;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
