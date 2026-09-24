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
import { ExerciseDifficultyLevel } from '../enums/exercise-difficulty-level.enum';
import { ExerciseEquipmentType } from '../enums/exercise-equipment-type.enum';
import { ExerciseMuscleGroup } from '../enums/exercise-muscle-group.enum';
import { ExerciseStatus } from '../enums/exercise-status.enum';

@Entity({ name: 'exercises' })
export class Exercise {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 150 })
  name!: string;

  @Column({ type: 'varchar', length: 2000, nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 5000, nullable: true })
  instructions!: string | null;

  @Column({
    name: 'primary_muscle_group',
    type: 'enum',
    enum: ExerciseMuscleGroup,
    enumName: 'exercise_muscle_group',
  })
  primaryMuscleGroup!: ExerciseMuscleGroup;

  @Column({
    name: 'equipment_type',
    type: 'enum',
    enum: ExerciseEquipmentType,
    enumName: 'exercise_equipment_type',
  })
  equipmentType!: ExerciseEquipmentType;

  @Column({
    name: 'difficulty_level',
    type: 'enum',
    enum: ExerciseDifficultyLevel,
    enumName: 'exercise_difficulty_level',
  })
  difficultyLevel!: ExerciseDifficultyLevel;

  @Column({
    type: 'enum',
    enum: ExerciseStatus,
    enumName: 'exercise_status',
    default: ExerciseStatus.ACTIVE,
  })
  status!: ExerciseStatus;

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
