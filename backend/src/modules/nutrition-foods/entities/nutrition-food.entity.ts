import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { NutritionFoodStatus } from '../enums/nutrition-food-status.enum';
import { numericTransformer } from '../numeric.transformer';

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

  @Column({ name: 'created_by_user_id', type: 'uuid' })
  createdByUserId!: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by_user_id' })
  createdByUser!: User;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
