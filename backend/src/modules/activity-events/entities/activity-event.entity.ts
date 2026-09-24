import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ClientProfile } from '../../clients/entities/client-profile.entity';
import { User } from '../../users/entities/user.entity';
import { ActivityEventEntityType } from '../enums/activity-event-entity-type.enum';
import { ActivityEventType } from '../enums/activity-event-type.enum';

@Entity({ name: 'activity_events' })
export class ActivityEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'enum',
    enum: ActivityEventType,
    enumName: 'activity_event_type',
  })
  type!: ActivityEventType;

  @Column({ name: 'actor_user_id', type: 'uuid' })
  actorUserId!: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'actor_user_id' })
  actorUser!: User;

  @Column({ name: 'client_profile_id', type: 'uuid', nullable: true })
  clientProfileId!: string | null;

  @ManyToOne(() => ClientProfile, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'client_profile_id' })
  clientProfile!: ClientProfile | null;

  @Column({
    name: 'related_entity_type',
    type: 'enum',
    enum: ActivityEventEntityType,
    enumName: 'activity_event_entity_type',
  })
  relatedEntityType!: ActivityEventEntityType;

  @Column({ name: 'related_entity_id', type: 'uuid' })
  relatedEntityId!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
