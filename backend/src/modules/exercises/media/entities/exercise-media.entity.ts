import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../../users/entities/user.entity';
import { Exercise } from '../../entities/exercise.entity';
import { ExerciseMediaStatus } from '../enums/exercise-media-status.enum';
import { ExerciseMediaType } from '../enums/exercise-media-type.enum';

@Entity({ name: 'exercise_media' })
export class ExerciseMedia {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'exercise_id', type: 'uuid' })
  exerciseId!: string;

  @ManyToOne(() => Exercise, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'exercise_id' })
  exercise!: Exercise;

  @Column({
    name: 'media_type',
    type: 'enum',
    enum: ExerciseMediaType,
    enumName: 'exercise_media_type',
  })
  mediaType!: ExerciseMediaType;

  @Column({ name: 'storage_key', type: 'varchar', length: 512, unique: true })
  storageKey!: string;

  @Column({
    name: 'original_file_name',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  originalFileName!: string | null;

  @Column({ name: 'mime_type', type: 'varchar', length: 100 })
  mimeType!: string;

  @Column({
    name: 'file_size_bytes',
    type: 'bigint',
    nullable: true,
    transformer: {
      to: (value: number | null) => value,
      from: (value: string | null) => (value === null ? null : Number(value)),
    },
  })
  fileSizeBytes!: number | null;

  @Column({
    type: 'enum',
    enum: ExerciseMediaStatus,
    enumName: 'exercise_media_status',
  })
  status!: ExerciseMediaStatus;

  @Column({ name: 'display_order', type: 'int', default: 0 })
  displayOrder!: number;

  @Column({ name: 'created_by_user_id', type: 'uuid' })
  createdByUserId!: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by_user_id' })
  createdByUser!: User;

  @Column({ name: 'finalized_at', type: 'timestamptz', nullable: true })
  finalizedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
