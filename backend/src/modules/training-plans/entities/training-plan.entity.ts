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
import { TrainingPlanStatus } from '../enums/training-plan-status.enum';
import { TrainingPlanWorkout } from './training-plan-workout.entity';

@Entity({ name: 'training_plans' })
export class TrainingPlan {
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
    enum: TrainingPlanStatus,
    enumName: 'training_plan_status',
    default: TrainingPlanStatus.DRAFT,
  })
  status!: TrainingPlanStatus;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate!: Date | string | null;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate!: Date | string | null;

  @Column({ name: 'created_by_user_id', type: 'uuid' })
  createdByUserId!: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by_user_id' })
  createdByUser!: User;

  @Column({ name: 'activated_at', type: 'timestamptz', nullable: true })
  activatedAt!: Date | null;

  @Column({ name: 'archived_at', type: 'timestamptz', nullable: true })
  archivedAt!: Date | null;

  @OneToMany(() => TrainingPlanWorkout, (workout) => workout.trainingPlan)
  workouts!: TrainingPlanWorkout[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
