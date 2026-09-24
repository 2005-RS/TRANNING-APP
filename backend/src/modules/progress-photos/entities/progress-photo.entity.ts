import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BodyMeasurement } from '../../body-measurements/entities/body-measurement.entity';
import { ClientProfile } from '../../clients/entities/client-profile.entity';
import { ProgressPhotoPose } from '../enums/progress-photo-pose.enum';
import { ProgressPhotoStatus } from '../enums/progress-photo-status.enum';

@Entity({ name: 'progress_photos' })
export class ProgressPhoto {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'client_profile_id', type: 'uuid' })
  clientProfileId!: string;

  @ManyToOne(() => ClientProfile, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'client_profile_id' })
  clientProfile!: ClientProfile;

  @Column({ name: 'body_measurement_id', type: 'uuid', nullable: true })
  bodyMeasurementId!: string | null;

  @ManyToOne(() => BodyMeasurement, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'body_measurement_id' })
  bodyMeasurement!: BodyMeasurement | null;

  @Column({
    type: 'enum',
    enum: ProgressPhotoPose,
    enumName: 'progress_photo_pose',
  })
  pose!: ProgressPhotoPose;

  @Column({
    type: 'enum',
    enum: ProgressPhotoStatus,
    enumName: 'progress_photo_status',
  })
  status!: ProgressPhotoStatus;

  @Column({ name: 'storage_key', type: 'varchar', length: 512, unique: true })
  storageKey!: string;

  @Column({ name: 'original_file_name', type: 'varchar', length: 255 })
  originalFileName!: string;

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

  @Column({ name: 'captured_at', type: 'timestamptz' })
  capturedAt!: Date;

  @Column({ name: 'finalized_at', type: 'timestamptz', nullable: true })
  finalizedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
