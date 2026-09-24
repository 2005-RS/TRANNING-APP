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
import { User } from '../../users/entities/user.entity';
import { CheckIn } from './check-in.entity';

@Entity({ name: 'check_in_reviews' })
export class CheckInReview {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'check_in_id', type: 'uuid', unique: true })
  checkInId!: string;

  @OneToOne(() => CheckIn, (checkIn) => checkIn.review, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'check_in_id' })
  checkIn!: CheckIn;

  @Column({ name: 'reviewed_by_user_id', type: 'uuid' })
  reviewedByUserId!: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'reviewed_by_user_id' })
  reviewedByUser!: User;

  @Column({ type: 'varchar', length: 4000 })
  feedback!: string;

  @Column({
    name: 'action_items',
    type: 'varchar',
    length: 2000,
    nullable: true,
  })
  actionItems!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
