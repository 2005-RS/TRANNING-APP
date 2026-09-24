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
import { Exercise } from '../../exercises/entities/exercise.entity';
import { WorkoutPrescriptionType } from '../../workout-templates/enums/workout-prescription-type.enum';
import { WorkoutSession } from './workout-session.entity';
import { WorkoutSet } from './workout-set.entity';

const numericTransformer = {
  to: (value: number | null) => value,
  from: (value: string | number | null) =>
    value === null ? null : Number(value),
};

@Entity({ name: 'workout_session_exercises' })
export class WorkoutSessionExercise {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'workout_session_id', type: 'uuid' })
  workoutSessionId!: string;

  @ManyToOne(() => WorkoutSession, (session) => session.exercises, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'workout_session_id' })
  session!: WorkoutSession;

  @Column({ name: 'source_training_plan_exercise_id', type: 'uuid' })
  sourceTrainingPlanExerciseId!: string;

  @Column({ name: 'exercise_id', type: 'uuid' })
  exerciseId!: string;

  @ManyToOne(() => Exercise, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'exercise_id' })
  exercise!: Exercise;

  @Column({ name: 'exercise_name_snapshot', type: 'varchar', length: 150 })
  exerciseNameSnapshot!: string;

  @Column({ type: 'int' })
  position!: number;

  @Column({ name: 'prescribed_sets', type: 'int' })
  prescribedSets!: number;

  @Column({
    name: 'prescription_type',
    type: 'enum',
    enum: WorkoutPrescriptionType,
    enumName: 'workout_prescription_type',
  })
  prescriptionType!: WorkoutPrescriptionType;

  @Column({ name: 'prescribed_reps_min', type: 'int', nullable: true })
  prescribedRepsMin!: number | null;

  @Column({ name: 'prescribed_reps_max', type: 'int', nullable: true })
  prescribedRepsMax!: number | null;

  @Column({
    name: 'prescribed_duration_seconds',
    type: 'int',
    nullable: true,
  })
  prescribedDurationSeconds!: number | null;

  @Column({ name: 'prescribed_rest_seconds', type: 'int' })
  prescribedRestSeconds!: number;

  @Column({
    name: 'prescribed_target_load_kg',
    type: 'numeric',
    precision: 7,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  prescribedTargetLoadKg!: number | null;

  @Column({
    name: 'prescribed_target_rpe',
    type: 'numeric',
    precision: 3,
    scale: 1,
    nullable: true,
    transformer: numericTransformer,
  })
  prescribedTargetRpe!: number | null;

  @Column({ name: 'prescribed_target_rir', type: 'int', nullable: true })
  prescribedTargetRir!: number | null;

  @Column({
    name: 'prescribed_tempo',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  prescribedTempo!: string | null;

  @Column({
    name: 'prescribed_notes',
    type: 'varchar',
    length: 1000,
    nullable: true,
  })
  prescribedNotes!: string | null;

  @OneToMany(() => WorkoutSet, (set) => set.sessionExercise)
  sets!: WorkoutSet[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
