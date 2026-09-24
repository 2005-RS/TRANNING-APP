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
import { WorkoutPrescriptionType } from '../enums/workout-prescription-type.enum';
import { WorkoutTemplate } from './workout-template.entity';

@Entity({ name: 'workout_template_exercises' })
export class WorkoutTemplateExercise {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'workout_template_id', type: 'uuid' })
  workoutTemplateId!: string;

  @ManyToOne(() => WorkoutTemplate, (template) => template.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'workout_template_id' })
  workoutTemplate!: WorkoutTemplate;

  @Column({ name: 'exercise_id', type: 'uuid' })
  exerciseId!: string;

  @ManyToOne(() => Exercise, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'exercise_id' })
  exercise!: Exercise;

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
