import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ClientProfile } from '../../clients/entities/client-profile.entity';
@Entity({ name: 'client_subscriptions' })
export class ClientSubscription {
  @PrimaryColumn({ name: 'client_profile_id', type: 'uuid' })
  clientProfileId!: string;
  @OneToOne(() => ClientProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_profile_id' })
  clientProfile!: ClientProfile;
  @Column({ name: 'pro_until', type: 'timestamptz', nullable: true })
  proUntil!: Date | null;
  @Column({ type: 'boolean', default: false }) complimentary!: boolean;
  @Column({ name: 'updated_by_user_id', type: 'uuid', nullable: true })
  updatedByUserId!: string | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
