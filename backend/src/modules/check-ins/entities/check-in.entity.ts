import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ClientProfile } from '../../clients/entities/client-profile.entity';
import { CheckInStatus } from '../enums/check-in-status.enum';
import { CheckInReview } from './check-in-review.entity';

@Entity({ name: 'check_ins' })
export class CheckIn {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'client_profile_id', type: 'uuid' })
  clientProfileId!: string;

  @ManyToOne(() => ClientProfile, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'client_profile_id' })
  clientProfile!: ClientProfile;

  @Column({ name: 'period_start', type: 'date' })
  periodStart!: Date | string;

  @Column({ name: 'period_end', type: 'date' })
  periodEnd!: Date | string;

  @Column({
    type: 'enum',
    enum: CheckInStatus,
    enumName: 'check_in_status',
    default: CheckInStatus.DRAFT,
  })
  status!: CheckInStatus;

  @Column({ name: 'sleep_quality', type: 'integer', nullable: true })
  sleepQuality!: number | null;

  @Column({ name: 'energy_level', type: 'integer', nullable: true })
  energyLevel!: number | null;

  @Column({ name: 'stress_level', type: 'integer', nullable: true })
  stressLevel!: number | null;

  @Column({ name: 'hunger_level', type: 'integer', nullable: true })
  hungerLevel!: number | null;

  @Column({ name: 'recovery_level', type: 'integer', nullable: true })
  recoveryLevel!: number | null;

  @Column({ name: 'training_adherence_pct', type: 'integer', nullable: true })
  trainingAdherencePct!: number | null;

  @Column({ name: 'nutrition_adherence_pct', type: 'integer', nullable: true })
  nutritionAdherencePct!: number | null;

  @Column({ type: 'varchar', length: 2000, nullable: true })
  wins!: string | null;

  @Column({ type: 'varchar', length: 2000, nullable: true })
  challenges!: string | null;

  @Column({
    name: 'general_notes',
    type: 'varchar',
    length: 2000,
    nullable: true,
  })
  generalNotes!: string | null;

  @Column({ name: 'submitted_at', type: 'timestamptz', nullable: true })
  submittedAt!: Date | null;

  @OneToOne(() => CheckInReview, (review) => review.checkIn)
  review?: CheckInReview | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
