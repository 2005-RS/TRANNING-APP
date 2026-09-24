import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WorkoutPrescriptionType } from '../../workout-templates/enums/workout-prescription-type.enum';
import { TrainingPlanDayOfWeek } from '../enums/training-plan-day-of-week.enum';
import { TrainingPlanStatus } from '../enums/training-plan-status.enum';

export class TrainingPlanExerciseResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  exerciseId!: string;

  @ApiProperty({ example: 'Barbell Bench Press' })
  exerciseName!: string;

  @ApiProperty()
  position!: number;

  @ApiProperty()
  sets!: number;

  @ApiProperty({ enum: WorkoutPrescriptionType })
  prescriptionType!: WorkoutPrescriptionType;

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

export class TrainingPlanWorkoutResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  sourceWorkoutTemplateId!: string;

  @ApiProperty({ example: 'Push Day' })
  name!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  description!: string | null;

  @ApiProperty()
  position!: number;

  @ApiPropertyOptional({
    enum: TrainingPlanDayOfWeek,
    nullable: true,
  })
  scheduledDay!: TrainingPlanDayOfWeek | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  notes!: string | null;

  @ApiProperty({ type: [TrainingPlanExerciseResponseDto] })
  exercises!: TrainingPlanExerciseResponseDto[];
}

export class TrainingPlanSummaryResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 'Hypertrophy Phase 1' })
  name!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  description!: string | null;

  @ApiProperty({ enum: TrainingPlanStatus })
  status!: TrainingPlanStatus;

  @ApiPropertyOptional({ nullable: true, type: String, example: '2026-09-07' })
  startDate!: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  endDate!: string | null;

  @ApiProperty()
  clientProfileId!: string;

  @ApiProperty()
  createdByUserId!: string;

  @ApiPropertyOptional({ nullable: true, type: Date })
  activatedAt!: Date | null;

  @ApiPropertyOptional({ nullable: true, type: Date })
  archivedAt!: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class TrainingPlanResponseDto extends TrainingPlanSummaryResponseDto {
  @ApiProperty({ type: [TrainingPlanWorkoutResponseDto] })
  workouts!: TrainingPlanWorkoutResponseDto[];
}

export class CurrentTrainingPlanResponseDto {
  @ApiPropertyOptional({
    type: TrainingPlanResponseDto,
    nullable: true,
  })
  trainingPlan!: TrainingPlanResponseDto | null;
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

export class PaginatedTrainingPlansResponseDto {
  @ApiProperty({ type: [TrainingPlanSummaryResponseDto] })
  data!: TrainingPlanSummaryResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}
