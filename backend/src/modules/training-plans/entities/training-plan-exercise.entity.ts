import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Exercise } from '../../exercises/entities/exercise.entity';
import { WorkoutPrescriptionType } from '../../workout-templates/enums/workout-prescription-type.enum';
import { TrainingPlanWorkout } from './training-plan-workout.entity';

@Entity({ name: 'training_plan_exercises' })
export class TrainingPlanExercise {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'training_plan_workout_id', type: 'uuid' })
  trainingPlanWorkoutId!: string;

  @ManyToOne(() => TrainingPlanWorkout, (workout) => workout.exercises, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'training_plan_workout_id' })
  workout!: TrainingPlanWorkout;

  @Column({ name: 'exercise_id', type: 'uuid' })
  exerciseId!: string;

  @ManyToOne(() => Exercise, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'exercise_id' })
  exercise!: Exercise;

  @Column({ name: 'exercise_name_snapshot', type: 'varchar', length: 150 })
  exerciseNameSnapshot!: string;

  @Column({ type: 'int' })
  position!: number;

  @Column({ type: 'int' })
  sets!: number;

  @Column({
    name: 'prescription_type',
    type: 'enum',
    enum: WorkoutPrescriptionType,
    enumName: 'workout_prescription_type',
  })
  prescriptionType!: WorkoutPrescriptionType;

  @Column({ name: 'reps_min', type: 'int', nullable: true })
  repsMin!: number | null;

  @Column({ name: 'reps_max', type: 'int', nullable: true })
  repsMax!: number | null;

  @Column({ name: 'duration_seconds', type: 'int', nullable: true })
  durationSeconds!: number | null;

  @Column({ name: 'rest_seconds', type: 'int' })
  restSeconds!: number;

  @Column({
    name: 'target_load_kg',
    type: 'numeric',
    precision: 7,
    scale: 2,
    nullable: true,
    transformer: {
      to: (value: number | null) => value,
      from: (value: string | number | null) =>
        value === null ? null : Number(value),
    },
  })
  targetLoadKg!: number | null;

  @Column({
    name: 'target_rpe',
    type: 'numeric',
    precision: 3,
    scale: 1,
    nullable: true,
    transformer: {
      to: (value: number | null) => value,
      from: (value: string | number | null) =>
        value === null ? null : Number(value),
    },
  })
  targetRpe!: number | null;

  @Column({ name: 'target_rir', type: 'int', nullable: true })
  targetRir!: number | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  tempo!: string | null;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
