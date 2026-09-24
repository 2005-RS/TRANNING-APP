import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ClientExperienceLevel } from '../enums/client-experience-level.enum';
import { ClientPrimaryGoal } from '../enums/client-primary-goal.enum';

@Entity({ name: 'client_profiles' })
export class ClientProfile {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid', unique: true })
  userId!: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'varchar', length: 32, nullable: true })
  phone!: string | null;

  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  dateOfBirth!: Date | string | null;

  @Column({
    name: 'primary_goal',
    type: 'enum',
    enum: ClientPrimaryGoal,
    enumName: 'client_primary_goal',
  })
  primaryGoal!: ClientPrimaryGoal;

  @Column({ name: 'goal_notes', type: 'text', nullable: true })
  goalNotes!: string | null;

  @Column({
    name: 'experience_level',
    type: 'enum',
    enum: ClientExperienceLevel,
    enumName: 'client_experience_level',
  })
  experienceLevel!: ClientExperienceLevel;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
