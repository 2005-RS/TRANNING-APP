import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ClientProfile } from '../../clients/entities/client-profile.entity';
import { TrainerProfile } from '../../trainers/entities/trainer-profile.entity';
import { User } from '../../users/entities/user.entity';

@Entity({ name: 'trainer_client_assignments' })
export class TrainerClientAssignment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'trainer_profile_id', type: 'uuid' })
  trainerProfileId!: string;

  @ManyToOne(() => TrainerProfile, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'trainer_profile_id' })
  trainerProfile!: TrainerProfile;

  @Column({ name: 'client_profile_id', type: 'uuid' })
  clientProfileId!: string;

  @ManyToOne(() => ClientProfile, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'client_profile_id' })
  clientProfile!: ClientProfile;

  @Column({ name: 'assigned_at', type: 'timestamptz' })
  assignedAt!: Date;

  @Column({ name: 'ended_at', type: 'timestamptz', nullable: true })
  endedAt!: Date | null;

  @Column({ name: 'assigned_by_user_id', type: 'uuid' })
  assignedByUserId!: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'assigned_by_user_id' })
  assignedByUser!: User;

  @Column({ name: 'ended_by_user_id', type: 'uuid', nullable: true })
  endedByUserId!: string | null;

  @ManyToOne(() => User, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'ended_by_user_id' })
  endedByUser!: User | null;
}
