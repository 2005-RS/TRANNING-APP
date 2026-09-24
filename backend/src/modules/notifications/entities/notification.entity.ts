import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { ActivityEvent } from '../../activity-events/entities/activity-event.entity';
import { User } from '../../users/entities/user.entity';

@Entity({ name: 'notifications' })
@Unique('UQ_notifications_event_recipient', [
  'activityEventId',
  'recipientUserId',
])
@Index('IDX_notifications_recipient_created_at', [
  'recipientUserId',
  'createdAt',
])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'activity_event_id', type: 'uuid' })
  activityEventId!: string;

  @ManyToOne(() => ActivityEvent, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'activity_event_id' })
  activityEvent!: ActivityEvent;

  @Column({ name: 'recipient_user_id', type: 'uuid' })
  recipientUserId!: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'recipient_user_id' })
  recipientUser!: User;

  @Column({ name: 'read_at', type: 'timestamptz', nullable: true })
  readAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
