import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ClientProfile } from '../../clients/entities/client-profile.entity';
import {
  SubscriptionPaymentProvider,
  SubscriptionPaymentStatus,
} from '../enums/subscription-payment.enum';
@Entity({ name: 'subscription_payments' })
export class SubscriptionPayment {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'client_profile_id', type: 'uuid' }) clientProfileId!: string;
  @ManyToOne(() => ClientProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_profile_id' })
  clientProfile!: ClientProfile;
  @Column({
    type: 'enum',
    enum: SubscriptionPaymentProvider,
    enumName: 'subscription_payment_provider',
  })
  provider!: SubscriptionPaymentProvider;
  @Column({
    type: 'enum',
    enum: SubscriptionPaymentStatus,
    enumName: 'subscription_payment_status',
    default: SubscriptionPaymentStatus.Pending,
  })
  status!: SubscriptionPaymentStatus;
  @Column({ name: 'amount_crc', type: 'int' }) amountCrc!: number;
  @Column({ type: 'varchar', length: 40 }) reference!: string;
  @Column({ name: 'payer_phone', type: 'varchar', length: 16, nullable: true })
  payerPhone!: string | null;
  @Column({ name: 'paid_on', type: 'date' }) paidOn!: string;
  @Column({ name: 'period_start', type: 'timestamptz', nullable: true })
  periodStart!: Date | null;
  @Column({ name: 'period_end', type: 'timestamptz', nullable: true })
  periodEnd!: Date | null;
  @Column({ name: 'reviewed_by_user_id', type: 'uuid', nullable: true })
  reviewedByUserId!: string | null;
  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt!: Date | null;
  @Column({
    name: 'rejection_reason',
    type: 'varchar',
    length: 300,
    nullable: true,
  })
  rejectionReason!: string | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
