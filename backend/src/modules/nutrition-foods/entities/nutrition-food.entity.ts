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
import { User } from '../../users/entities/user.entity';
import { NutritionFoodNameOrigin } from '../enums/nutrition-food-name-origin.enum';
import { NutritionFoodSource } from '../enums/nutrition-food-source.enum';
import { NutritionFoodStatus } from '../enums/nutrition-food-status.enum';
import { NutritionFoodVisibility } from '../enums/nutrition-food-visibility.enum';
import { numericTransformer } from '../numeric.transformer';
import { FoodNutrient } from './food-nutrient.entity';
import { FoodPortion } from './food-portion.entity';

@Entity({ name: 'nutrition_foods' })
export class NutritionFood {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 150 })
  name!: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  brand!: string | null;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  description!: string | null;

  @Column({
    type: 'enum',
    enum: NutritionFoodSource,
    enumName: 'nutrition_food_source',
    default: NutritionFoodSource.MANUAL,
  })
  source!: NutritionFoodSource;

  @Column({ name: 'external_id', type: 'varchar', length: 64, nullable: true })
  externalId!: string | null;

  @Column({ name: 'source_data_type', type: 'varchar', nullable: true })
  sourceDataType!: string | null;

  @Column({ name: 'source_version', type: 'varchar', nullable: true })
  sourceVersion!: string | null;

  @Column({ name: 'imported_at', type: 'timestamptz', nullable: true })
  importedAt!: Date | null;

  @Column({ name: 'imported_by_user_id', type: 'uuid', nullable: true })
  importedByUserId!: string | null;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'imported_by_user_id' })
  importedByUser!: User | null;

  @Column({
    name: 'density_g_per_ml',
    type: 'numeric',
    precision: 10,
    scale: 3,
    nullable: true,
    transformer: numericTransformer,
  })
  densityGPerMl!: number | null;

  @Column({
    name: 'name_original',
    type: 'varchar',
    length: 300,
    nullable: true,
  })
  nameOriginal!: string | null;

  @Column({
    name: 'name_origin',
    type: 'enum',
    enum: NutritionFoodNameOrigin,
    enumName: 'nutrition_food_name_origin',
    default: NutritionFoodNameOrigin.MANUAL,
  })
  nameOrigin!: NutritionFoodNameOrigin;

  @Column({ name: 'name_verified_at', type: 'timestamptz', nullable: true })
  nameVerifiedAt!: Date | null;

  @Column({ name: 'name_verified_by_user_id', type: 'uuid', nullable: true })
  nameVerifiedByUserId!: string | null;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'name_verified_by_user_id' })
  nameVerifiedByUser!: User | null;

  @Column({
    name: 'calories_per_100g',
    type: 'numeric',
    precision: 7,
    scale: 2,
    transformer: numericTransformer,
  })
  caloriesPer100g!: number;

  @Column({
    name: 'protein_g_per_100g',
    type: 'numeric',
    precision: 6,
    scale: 2,
    transformer: numericTransformer,
  })
  proteinGPer100g!: number;

  @Column({
    name: 'carbohydrates_g_per_100g',
    type: 'numeric',
    precision: 6,
    scale: 2,
    transformer: numericTransformer,
  })
  carbohydratesGPer100g!: number;

  @Column({
    name: 'fat_g_per_100g',
    type: 'numeric',
    precision: 6,
    scale: 2,
    transformer: numericTransformer,
  })
  fatGPer100g!: number;

  @Column({
    name: 'fiber_g_per_100g',
    type: 'numeric',
    precision: 6,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  fiberGPer100g!: number | null;

  @Column({
    type: 'enum',
    enum: NutritionFoodStatus,
    enumName: 'nutrition_food_status',
    default: NutritionFoodStatus.ACTIVE,
  })
  status!: NutritionFoodStatus;

  @Column({
    type: 'enum',
    enum: NutritionFoodVisibility,
    enumName: 'nutrition_food_visibility',
    default: NutritionFoodVisibility.GLOBAL,
  })
  visibility!: NutritionFoodVisibility;

  @Column({ name: 'created_by_user_id', type: 'uuid' })
  createdByUserId!: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by_user_id' })
  createdByUser!: User;

  @OneToMany(() => FoodNutrient, (foodNutrient) => foodNutrient.food)
  foodNutrients!: FoodNutrient[];

  @OneToMany(() => FoodPortion, (portion) => portion.food)
  portions!: FoodPortion[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
