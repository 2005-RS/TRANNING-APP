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
import { TrainingPlanDayOfWeek } from '../../training-plans/enums/training-plan-day-of-week.enum';
import { TrainingPlan } from '../../training-plans/entities/training-plan.entity';
import { WorkoutSessionStatus } from '../enums/workout-session-status.enum';
import { WorkoutSessionExercise } from './workout-session-exercise.entity';

@Entity({ name: 'workout_sessions' })
export class WorkoutSession {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'client_profile_id', type: 'uuid' })
  clientProfileId!: string;

  @ManyToOne(() => ClientProfile, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'client_profile_id' })
  clientProfile!: ClientProfile;

  @Column({ name: 'training_plan_id', type: 'uuid' })
  trainingPlanId!: string;

  @ManyToOne(() => TrainingPlan, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'training_plan_id' })
  trainingPlan!: TrainingPlan;

  @Column({ name: 'source_training_plan_workout_id', type: 'uuid' })
  sourceTrainingPlanWorkoutId!: string;

  @Column({ name: 'workout_name_snapshot', type: 'varchar', length: 150 })
  workoutNameSnapshot!: string;

  @Column({
    name: 'workout_description_snapshot',
    type: 'varchar',
    length: 2000,
    nullable: true,
  })
  workoutDescriptionSnapshot!: string | null;

  @Column({
    name: 'scheduled_day_snapshot',
    type: 'enum',
    enum: TrainingPlanDayOfWeek,
    enumName: 'training_plan_day_of_week',
    nullable: true,
  })
  scheduledDaySnapshot!: TrainingPlanDayOfWeek | null;

  @Column({
    type: 'enum',
    enum: WorkoutSessionStatus,
    enumName: 'workout_session_status',
  })
  status!: WorkoutSessionStatus;

  @Column({ name: 'started_at', type: 'timestamptz' })
  startedAt!: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt!: Date | null;

  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt!: Date | null;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  notes!: string | null;

  @OneToMany(() => WorkoutSessionExercise, (exercise) => exercise.session)
  exercises!: WorkoutSessionExercise[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
