import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { WorkoutTemplateStatus } from '../enums/workout-template-status.enum';
import { WorkoutTemplateExercise } from './workout-template-exercise.entity';

@Entity({ name: 'workout_templates' })
export class WorkoutTemplate {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 150 })
  name!: string;

  @Column({ type: 'varchar', length: 2000, nullable: true })
  description!: string | null;

  @Column({
    type: 'enum',
    enum: WorkoutTemplateStatus,
    enumName: 'workout_template_status',
    default: WorkoutTemplateStatus.DRAFT,
  })
  status!: WorkoutTemplateStatus;

  @Column({ name: 'created_by_user_id', type: 'uuid' })
  createdByUserId!: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by_user_id' })
  createdByUser!: User;

  @OneToMany(() => WorkoutTemplateExercise, (item) => item.workoutTemplate)
  items!: WorkoutTemplateExercise[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
