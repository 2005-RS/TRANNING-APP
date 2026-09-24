import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { WorkoutSessionExercise } from './workout-session-exercise.entity';

const numericTransformer = {
  to: (value: number | null) => value,
  from: (value: string | number | null) =>
    value === null ? null : Number(value),
};

@Entity({ name: 'workout_sets' })
export class WorkoutSet {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'workout_session_exercise_id', type: 'uuid' })
  workoutSessionExerciseId!: string;

  @ManyToOne(() => WorkoutSessionExercise, (exercise) => exercise.sets, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'workout_session_exercise_id' })
  sessionExercise!: WorkoutSessionExercise;

  @Column({ name: 'set_number', type: 'int' })
  setNumber!: number;

  @Column({ name: 'actual_reps', type: 'int', nullable: true })
  actualReps!: number | null;

  @Column({ name: 'actual_duration_seconds', type: 'int', nullable: true })
  actualDurationSeconds!: number | null;

  @Column({
    name: 'actual_load_kg',
    type: 'numeric',
    precision: 7,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  actualLoadKg!: number | null;

  @Column({
    name: 'actual_rpe',
    type: 'numeric',
    precision: 3,
    scale: 1,
    nullable: true,
    transformer: numericTransformer,
  })
  actualRpe!: number | null;

  @Column({ name: 'actual_rir', type: 'int', nullable: true })
  actualRir!: number | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
