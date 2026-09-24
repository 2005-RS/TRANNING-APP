import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExerciseDifficultyLevel } from '../../exercises/enums/exercise-difficulty-level.enum';
import { ExerciseEquipmentType } from '../../exercises/enums/exercise-equipment-type.enum';
import { ExerciseMuscleGroup } from '../../exercises/enums/exercise-muscle-group.enum';
import { ExerciseStatus } from '../../exercises/enums/exercise-status.enum';
import { WorkoutPrescriptionType } from '../enums/workout-prescription-type.enum';
import { WorkoutTemplateStatus } from '../enums/workout-template-status.enum';

export class WorkoutTemplateExerciseSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 'Barbell Bench Press' })
  name!: string;

  @ApiProperty({ enum: ExerciseMuscleGroup })
  primaryMuscleGroup!: ExerciseMuscleGroup;

  @ApiProperty({ enum: ExerciseEquipmentType })
  equipmentType!: ExerciseEquipmentType;

  @ApiProperty({ enum: ExerciseDifficultyLevel })
  difficultyLevel!: ExerciseDifficultyLevel;

  @ApiProperty({ enum: ExerciseStatus })
  status!: ExerciseStatus;
}

export class WorkoutTemplateExerciseResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  position!: number;

  @ApiProperty({ type: WorkoutTemplateExerciseSummaryDto })
  exercise!: WorkoutTemplateExerciseSummaryDto;

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
  targetRpe!: number | null;

  @ApiPropertyOptional({ nullable: true, type: Number })
  targetRir!: number | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  tempo!: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  notes!: string | null;
}

export class WorkoutTemplateSummaryResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 'Push Day' })
  name!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  description!: string | null;

  @ApiProperty({ enum: WorkoutTemplateStatus })
  status!: WorkoutTemplateStatus;

  @ApiProperty()
  createdByUserId!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class WorkoutTemplateResponseDto extends WorkoutTemplateSummaryResponseDto {
  @ApiProperty({ type: [WorkoutTemplateExerciseResponseDto] })
  items!: WorkoutTemplateExerciseResponseDto[];
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

export class PaginatedWorkoutTemplatesResponseDto {
  @ApiProperty({ type: [WorkoutTemplateSummaryResponseDto] })
  data!: WorkoutTemplateSummaryResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}
