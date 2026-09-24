import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExerciseStatus } from '../../exercises/enums/exercise-status.enum';
import { WorkoutPrescriptionType } from '../../workout-templates/enums/workout-prescription-type.enum';

export class ProgressSummaryResponseDto {
  @ApiProperty({
    description:
      'Distinct COMPLETED WorkoutSessions that contain at least one actual WorkoutSet in the date range.',
  })
  completedSessions!: number;

  @ApiProperty({
    description:
      'Actual WorkoutSet rows in COMPLETED sessions. Prescribed-only exercises are not counted.',
  })
  performedSets!: number;

  @ApiProperty({
    description:
      'Distinct canonical exerciseId values with at least one actual set in COMPLETED sessions.',
  })
  exercisesPerformed!: number;

  @ApiProperty({
    description:
      'SUM(actualReps) for REPS sets, including actualReps = 0. DURATION sets are excluded.',
  })
  totalReps!: number;

  @ApiProperty({
    description:
      'SUM(actualLoadKg * actualReps) only when both values are NOT NULL. Null load does not assume bodyweight. Zero load contributes 0. This is external load volume, not total biomechanical volume.',
  })
  externalLoadVolumeKg!: number;

  @ApiProperty({
    description:
      'SUM(actualDurationSeconds) for DURATION sets. REPS sets are excluded.',
  })
  totalDurationSeconds!: number;

  @ApiPropertyOptional({
    nullable: true,
    type: Date,
    description:
      'MIN(startedAt) among eligible COMPLETED sessions. Null when no history exists.',
  })
  firstCompletedSessionAt!: Date | null;

  @ApiPropertyOptional({
    nullable: true,
    type: Date,
    description:
      'MAX(startedAt) among eligible COMPLETED sessions. Null when no history exists.',
  })
  lastCompletedSessionAt!: Date | null;
}

export class ExerciseProgressListItemDto {
  @ApiProperty()
  exerciseId!: string;

  @ApiProperty({
    description:
      'Current canonical Exercise.name, even if the Exercise was renamed after sessions were completed.',
  })
  exerciseName!: string;

  @ApiProperty({ enum: ExerciseStatus })
  exerciseStatus!: ExerciseStatus;

  @ApiProperty({
    enum: WorkoutPrescriptionType,
    description:
      'Historical execution type for this row. The same exerciseId may appear twice if both REPS and DURATION sets exist.',
  })
  prescriptionType!: WorkoutPrescriptionType;

  @ApiProperty()
  completedSessions!: number;

  @ApiProperty()
  performedSets!: number;

  @ApiPropertyOptional({
    nullable: true,
    type: Number,
    description: 'REPS only. Null for DURATION rows.',
  })
  totalReps!: number | null;

  @ApiPropertyOptional({
    nullable: true,
    type: Number,
    description:
      'REPS only. External load volume in kilograms. Null for DURATION rows.',
  })
  externalLoadVolumeKg!: number | null;

  @ApiPropertyOptional({
    nullable: true,
    type: Number,
    description:
      'REPS only. MAX(actualLoadKg) where actualReps > 0 and actualLoadKg IS NOT NULL (zero load is eligible). Null for DURATION rows.',
  })
  bestLoadKg!: number | null;

  @ApiPropertyOptional({
    nullable: true,
    type: Number,
    description:
      'REPS only. Highest actualReps recorded in one completed set. Null for DURATION rows.',
  })
  bestReps!: number | null;

  @ApiPropertyOptional({
    nullable: true,
    type: Number,
    description:
      'REPS only. Maximum Epley estimate: actualLoadKg × (1 + actualReps / 30) for load > 0 and 1–10 reps. Not an actual tested 1RM. Null for DURATION rows or when no eligible set exists.',
  })
  bestEstimated1RmKg!: number | null;

  @ApiPropertyOptional({
    nullable: true,
    type: Number,
    description: 'DURATION only. Null for REPS rows.',
  })
  totalDurationSeconds!: number | null;

  @ApiPropertyOptional({
    nullable: true,
    type: Number,
    description: 'DURATION only. Null for REPS rows.',
  })
  bestDurationSeconds!: number | null;

  @ApiProperty()
  firstPerformedAt!: Date;

  @ApiProperty()
  lastPerformedAt!: Date;
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

export class PaginatedExerciseProgressResponseDto {
  @ApiProperty({ type: [ExerciseProgressListItemDto] })
  data!: ExerciseProgressListItemDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}

export class ProgressPersonalBestDto {
  @ApiProperty()
  value!: number;

  @ApiProperty()
  workoutSessionId!: string;

  @ApiProperty()
  performedAt!: Date;

  @ApiProperty()
  setNumber!: number;
}

export class Estimated1RmPersonalBestDto extends ProgressPersonalBestDto {
  @ApiProperty()
  actualLoadKg!: number;

  @ApiProperty()
  actualReps!: number;
}

export class ProgressHistorySetDto {
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
}

export class ProgressHistoryOccurrenceDto {
  @ApiProperty({
    description:
      'WorkoutSessionExercise id. Required because setNumber is unique per occurrence, not per session, when the same Exercise appears twice.',
  })
  workoutSessionExerciseId!: string;

  @ApiProperty()
  position!: number;

  @ApiProperty({
    description: 'Historical Exercise name captured when the session started.',
  })
  exerciseNameSnapshot!: string;

  @ApiProperty({ type: [ProgressHistorySetDto] })
  sets!: ProgressHistorySetDto[];
}

export class ProgressSessionHistoryItemDto {
  @ApiProperty()
  workoutSessionId!: string;

  @ApiProperty()
  workoutName!: string;

  @ApiProperty({
    description:
      'WorkoutSession.startedAt. Date-range filters use this timestamp.',
  })
  performedAt!: Date;

  @ApiProperty({
    description:
      'Snapshot from the first occurrence in the session (lowest position).',
  })
  exerciseNameSnapshot!: string;

  @ApiProperty({ type: [ProgressHistoryOccurrenceDto] })
  occurrences!: ProgressHistoryOccurrenceDto[];

  @ApiPropertyOptional({
    nullable: true,
    type: Number,
    description:
      'REPS only. Session external load volume for this exercise/type.',
  })
  sessionExternalLoadVolumeKg!: number | null;

  @ApiPropertyOptional({
    nullable: true,
    type: Number,
    description:
      'REPS only. Best Epley estimate in this session for this exercise/type.',
  })
  bestEstimated1RmKg!: number | null;

  @ApiPropertyOptional({
    nullable: true,
    type: Number,
    description: 'DURATION only.',
  })
  totalDurationSeconds!: number | null;

  @ApiPropertyOptional({
    nullable: true,
    type: Number,
    description: 'DURATION only.',
  })
  bestDurationSeconds!: number | null;
}

export class PaginatedProgressHistoryDto {
  @ApiProperty({ type: [ProgressSessionHistoryItemDto] })
  data!: ProgressSessionHistoryItemDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}

export class RepsTrendPointDto {
  @ApiProperty()
  performedAt!: Date;

  @ApiProperty()
  workoutSessionId!: string;

  @ApiPropertyOptional({ nullable: true, type: Number })
  bestLoadKg!: number | null;

  @ApiPropertyOptional({ nullable: true, type: Number })
  bestEstimated1RmKg!: number | null;

  @ApiProperty()
  externalLoadVolumeKg!: number;

  @ApiProperty()
  totalReps!: number;
}

export class DurationTrendPointDto {
  @ApiProperty()
  performedAt!: Date;

  @ApiProperty()
  workoutSessionId!: string;

  @ApiPropertyOptional({ nullable: true, type: Number })
  bestDurationSeconds!: number | null;

  @ApiProperty()
  totalDurationSeconds!: number;

  @ApiProperty()
  performedSets!: number;
}

export class RepsProgressSectionDto {
  @ApiProperty({ enum: WorkoutPrescriptionType })
  prescriptionType!: WorkoutPrescriptionType;

  @ApiProperty()
  completedSessions!: number;

  @ApiProperty()
  performedSets!: number;

  @ApiProperty()
  totalReps!: number;

  @ApiProperty()
  externalLoadVolumeKg!: number;

  @ApiPropertyOptional({ nullable: true, type: Number })
  bestLoadKg!: number | null;

  @ApiPropertyOptional({ nullable: true, type: Number })
  bestReps!: number | null;

  @ApiPropertyOptional({ nullable: true, type: Number })
  bestEstimated1RmKg!: number | null;

  @ApiProperty()
  firstPerformedAt!: Date;

  @ApiProperty()
  lastPerformedAt!: Date;

  @ApiPropertyOptional({
    type: ProgressPersonalBestDto,
    nullable: true,
    description:
      'First time the current best load was achieved (highest load, then earliest startedAt, then lowest setNumber).',
  })
  bestLoad!: ProgressPersonalBestDto | null;

  @ApiPropertyOptional({
    type: ProgressPersonalBestDto,
    nullable: true,
  })
  bestRepsRecord!: ProgressPersonalBestDto | null;

  @ApiPropertyOptional({
    type: Estimated1RmPersonalBestDto,
    nullable: true,
    description:
      'First time the current best Epley estimate was achieved. Not an actual tested 1RM.',
  })
  bestEstimated1Rm!: Estimated1RmPersonalBestDto | null;

  @ApiProperty({ type: PaginatedProgressHistoryDto })
  history!: PaginatedProgressHistoryDto;

  @ApiProperty({
    type: [RepsTrendPointDto],
    description:
      'Derived per-session points for the current history page. Not stored. Bounded by the same page/limit as history.',
  })
  trend!: RepsTrendPointDto[];
}

export class DurationProgressSectionDto {
  @ApiProperty({ enum: WorkoutPrescriptionType })
  prescriptionType!: WorkoutPrescriptionType;

  @ApiProperty()
  completedSessions!: number;

  @ApiProperty()
  performedSets!: number;

  @ApiProperty()
  totalDurationSeconds!: number;

  @ApiPropertyOptional({ nullable: true, type: Number })
  bestDurationSeconds!: number | null;

  @ApiProperty()
  firstPerformedAt!: Date;

  @ApiProperty()
  lastPerformedAt!: Date;

  @ApiPropertyOptional({
    type: ProgressPersonalBestDto,
    nullable: true,
  })
  bestDuration!: ProgressPersonalBestDto | null;

  @ApiProperty({ type: PaginatedProgressHistoryDto })
  history!: PaginatedProgressHistoryDto;

  @ApiProperty({
    type: [DurationTrendPointDto],
    description:
      'Derived per-session points for the current history page. Not stored. Bounded by the same page/limit as history.',
  })
  trend!: DurationTrendPointDto[];
}

export class ExerciseProgressDetailResponseDto {
  @ApiProperty()
  exerciseId!: string;

  @ApiProperty({
    description: 'Current canonical Exercise.name.',
  })
  exerciseName!: string;

  @ApiProperty({ enum: ExerciseStatus })
  exerciseStatus!: ExerciseStatus;

  @ApiProperty({
    enum: WorkoutPrescriptionType,
    isArray: true,
    description:
      'Historical prescription types with at least one actual set in COMPLETED sessions for this Client and Exercise (within the date range).',
  })
  availablePrescriptionTypes!: WorkoutPrescriptionType[];

  @ApiPropertyOptional({
    type: RepsProgressSectionDto,
    nullable: true,
  })
  reps!: RepsProgressSectionDto | null;

  @ApiPropertyOptional({
    type: DurationProgressSectionDto,
    nullable: true,
  })
  duration!: DurationProgressSectionDto | null;
}
