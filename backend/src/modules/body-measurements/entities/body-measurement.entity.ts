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
import { numericTransformer } from '../numeric.transformer';

@Entity({ name: 'body_measurements' })
export class BodyMeasurement {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'client_profile_id', type: 'uuid' })
  clientProfileId!: string;

  @ManyToOne(() => ClientProfile, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'client_profile_id' })
  clientProfile!: ClientProfile;

  @Column({ name: 'measured_at', type: 'timestamptz' })
  measuredAt!: Date;

  @Column({
    name: 'body_weight_kg',
    type: 'numeric',
    precision: 6,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  bodyWeightKg!: number | null;

  @Column({
    name: 'body_fat_percentage',
    type: 'numeric',
    precision: 5,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  bodyFatPercentage!: number | null;

  @Column({
    name: 'neck_cm',
    type: 'numeric',
    precision: 6,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  neckCm!: number | null;

  @Column({
    name: 'shoulders_cm',
    type: 'numeric',
    precision: 6,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  shouldersCm!: number | null;

  @Column({
    name: 'chest_cm',
    type: 'numeric',
    precision: 6,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  chestCm!: number | null;

  @Column({
    name: 'waist_cm',
    type: 'numeric',
    precision: 6,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  waistCm!: number | null;

  @Column({
    name: 'hips_cm',
    type: 'numeric',
    precision: 6,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  hipsCm!: number | null;

  @Column({
    name: 'left_arm_cm',
    type: 'numeric',
    precision: 6,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  leftArmCm!: number | null;

  @Column({
    name: 'right_arm_cm',
    type: 'numeric',
    precision: 6,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  rightArmCm!: number | null;

  @Column({
    name: 'left_thigh_cm',
    type: 'numeric',
    precision: 6,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  leftThighCm!: number | null;

  @Column({
    name: 'right_thigh_cm',
    type: 'numeric',
    precision: 6,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  rightThighCm!: number | null;

  @Column({
    name: 'left_calf_cm',
    type: 'numeric',
    precision: 6,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  leftCalfCm!: number | null;

  @Column({
    name: 'right_calf_cm',
    type: 'numeric',
    precision: 6,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  rightCalfCm!: number | null;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
