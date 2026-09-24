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
import { WorkoutTemplate } from '../../workout-templates/entities/workout-template.entity';
import { TrainingPlanDayOfWeek } from '../enums/training-plan-day-of-week.enum';
import { TrainingPlan } from './training-plan.entity';
import { TrainingPlanExercise } from './training-plan-exercise.entity';

@Entity({ name: 'training_plan_workouts' })
export class TrainingPlanWorkout {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'training_plan_id', type: 'uuid' })
  trainingPlanId!: string;

  @ManyToOne(() => TrainingPlan, (plan) => plan.workouts, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'training_plan_id' })
  trainingPlan!: TrainingPlan;

  @Column({ name: 'source_workout_template_id', type: 'uuid' })
  sourceWorkoutTemplateId!: string;

  @ManyToOne(() => WorkoutTemplate, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'source_workout_template_id' })
  sourceWorkoutTemplate!: WorkoutTemplate;

  @Column({ name: 'name_snapshot', type: 'varchar', length: 150 })
  nameSnapshot!: string;

  @Column({
    name: 'description_snapshot',
    type: 'varchar',
    length: 2000,
    nullable: true,
  })
  descriptionSnapshot!: string | null;

  @Column({ type: 'int' })
  position!: number;

  @Column({
    name: 'scheduled_day',
    type: 'enum',
    enum: TrainingPlanDayOfWeek,
    enumName: 'training_plan_day_of_week',
    nullable: true,
  })
  scheduledDay!: TrainingPlanDayOfWeek | null;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  notes!: string | null;

  @OneToMany(() => TrainingPlanExercise, (exercise) => exercise.workout)
  exercises!: TrainingPlanExercise[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
