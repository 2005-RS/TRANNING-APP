import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WorkoutPrescriptionType } from '../enums/workout-prescription-type.enum';

export class WorkoutLibraryExerciseResponseDto {
  @ApiProperty()
  exerciseId!: string;

  @ApiProperty()
  name!: string;

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
}

export class WorkoutLibraryItemResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  description!: string | null;

  @ApiProperty()
  exerciseCount!: number;

  @ApiProperty()
  estimatedMinutes!: number;

  @ApiProperty({ type: [WorkoutLibraryExerciseResponseDto] })
  exercises!: WorkoutLibraryExerciseResponseDto[];
}
