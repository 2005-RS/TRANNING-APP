import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExerciseMediaResponseDto } from '../../exercises/media/dto/exercise-media-response.dto';
import { TrainingPlanDayOfWeek } from '../../training-plans/enums/training-plan-day-of-week.enum';
import { WorkoutPrescriptionType } from '../../workout-templates/enums/workout-prescription-type.enum';
import { WorkoutSessionStatus } from '../enums/workout-session-status.enum';

export class WorkoutSetResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  setNumber!: number;

  @ApiPropertyOptional({ nullable: true, type: Number })
  actualReps!: number | null;

  @ApiPropertyOptional({ nullable: true, type: Number })
  actualDurationSeconds!: number | null;

  @ApiPropertyOptional({ nullable: true, type: Number })
  actualLoadKg!: number | null;

  @ApiPropertyOptional({ nullable: true, type: Number })
  actualRpe!: number | null;

  @ApiPropertyOptional({ nullable: true, type: Number })
  actualRir!: number | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  notes!: string | null;
}

export class WorkoutSessionPrescriptionResponseDto {
  @ApiProperty()
  sets!: number;

  @ApiProperty({ enum: WorkoutPrescriptionType })
  type!: WorkoutPrescriptionType;

  @ApiPropertyOptional({ nullable: true, type: Number })
  repsMin!: number | null;

  @ApiPropertyOptional({ nullable: true, type: Number })
  repsMax!: number | null;

  @ApiPropertyOptional({ nullable: true, type: Number })
  durationSeconds!: number | null;

  @ApiProperty()
  restSeconds!: number;

  @ApiPropertyOptional({ nullable: true, type: Number })
  targetLoadKg!: number | null;

  @ApiPropertyOptional({ nullable: true, type: Number })
  targetRpe!: number | null;

  @ApiPropertyOptional({ nullable: true, type: Number })
  targetRir!: number | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  tempo!: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  notes!: string | null;
}

export class WorkoutSessionExerciseResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  sourceTrainingPlanExerciseId!: string;

  @ApiProperty()
  exerciseId!: string;

  @ApiProperty({ example: 'Barbell Bench Press' })
  exerciseName!: string;

  @ApiProperty()
  position!: number;

  @ApiProperty({ type: WorkoutSessionPrescriptionResponseDto })
  prescription!: WorkoutSessionPrescriptionResponseDto;

  @ApiProperty({ type: [WorkoutSetResponseDto] })
  sets!: WorkoutSetResponseDto[];

  @ApiPropertyOptional({
    type: ExerciseMediaResponseDto,
    nullable: true,
    description:
      'First READY demonstration for this catalog exercise. Metadata only; signed URLs are issued separately and must not be persisted.',
  })
  demonstrationMedia!: ExerciseMediaResponseDto | null;
}

export class WorkoutSessionSummaryResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  trainingPlanId!: string;

  @ApiProperty()
  sourceTrainingPlanWorkoutId!: string;

  @ApiProperty({ example: 'Push Day' })
  workoutName!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  workoutDescription!: string | null;

  @ApiPropertyOptional({
    enum: TrainingPlanDayOfWeek,
    nullable: true,
  })
  scheduledDay!: TrainingPlanDayOfWeek | null;

  @ApiProperty({ enum: WorkoutSessionStatus })
  status!: WorkoutSessionStatus;

  @ApiProperty()
  startedAt!: Date;

  @ApiPropertyOptional({ nullable: true, type: Date })
  completedAt!: Date | null;

  @ApiPropertyOptional({ nullable: true, type: Date })
  cancelledAt!: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class WorkoutSessionResponseDto extends WorkoutSessionSummaryResponseDto {
  @ApiProperty({ type: [WorkoutSessionExerciseResponseDto] })
  exercises!: WorkoutSessionExerciseResponseDto[];
}

export class CurrentWorkoutSessionResponseDto {
  @ApiPropertyOptional({
    type: WorkoutSessionResponseDto,
    nullable: true,
  })
  workoutSession!: WorkoutSessionResponseDto | null;
}

export class PaginationMetaDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  totalItems!: number;

  @ApiProperty()
  totalPages!: number;
}

export class PaginatedWorkoutSessionsResponseDto {
  @ApiProperty({ type: [WorkoutSessionSummaryResponseDto] })
  data!: WorkoutSessionSummaryResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}
