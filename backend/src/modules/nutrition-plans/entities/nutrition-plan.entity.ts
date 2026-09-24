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
import { ClientProfile } from '../../clients/entities/client-profile.entity';
import { User } from '../../users/entities/user.entity';
import { NutritionPlanStatus } from '../enums/nutrition-plan-status.enum';
import { numericTransformer } from '../numeric.transformer';
import { NutritionPlanMeal } from './nutrition-plan-meal.entity';

@Entity({ name: 'nutrition_plans' })
export class NutritionPlan {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'client_profile_id', type: 'uuid' })
  clientProfileId!: string;

  @ManyToOne(() => ClientProfile, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'client_profile_id' })
  clientProfile!: ClientProfile;

  @Column({ type: 'varchar', length: 150 })
  name!: string;

  @Column({ type: 'varchar', length: 2000, nullable: true })
  description!: string | null;

  @Column({
    type: 'enum',
    enum: NutritionPlanStatus,
    enumName: 'nutrition_plan_status',
    default: NutritionPlanStatus.DRAFT,
  })
  status!: NutritionPlanStatus;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate!: Date | string | null;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate!: Date | string | null;

  @Column({
    name: 'target_calories_kcal',
    type: 'numeric',
    precision: 8,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  targetCaloriesKcal!: number | null;

  @Column({
    name: 'target_protein_g',
    type: 'numeric',
    precision: 8,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  targetProteinG!: number | null;

  @Column({
    name: 'target_carbohydrates_g',
    type: 'numeric',
    precision: 8,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  targetCarbohydratesG!: number | null;

  @Column({
    name: 'target_fat_g',
    type: 'numeric',
    precision: 8,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  targetFatG!: number | null;

  @Column({ name: 'created_by_user_id', type: 'uuid' })
  createdByUserId!: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by_user_id' })
  createdByUser!: User;

  @Column({ name: 'activated_at', type: 'timestamptz', nullable: true })
  activatedAt!: Date | null;

  @Column({ name: 'archived_at', type: 'timestamptz', nullable: true })
  archivedAt!: Date | null;

  @OneToMany(() => NutritionPlanMeal, (meal) => meal.nutritionPlan)
  meals!: NutritionPlanMeal[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
