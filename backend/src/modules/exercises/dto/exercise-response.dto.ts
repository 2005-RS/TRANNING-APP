import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExerciseDifficultyLevel } from '../enums/exercise-difficulty-level.enum';
import { ExerciseEquipmentType } from '../enums/exercise-equipment-type.enum';
import { ExerciseMuscleGroup } from '../enums/exercise-muscle-group.enum';
import { ExerciseStatus } from '../enums/exercise-status.enum';

export class ExerciseResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 'Barbell Bench Press' })
  name!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  description!: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  instructions!: string | null;

  @ApiProperty({ enum: ExerciseMuscleGroup })
  primaryMuscleGroup!: ExerciseMuscleGroup;

  @ApiProperty({ enum: ExerciseEquipmentType })
  equipmentType!: ExerciseEquipmentType;

  @ApiProperty({ enum: ExerciseDifficultyLevel })
  difficultyLevel!: ExerciseDifficultyLevel;

  @ApiProperty({ enum: ExerciseStatus })
  status!: ExerciseStatus;

  @ApiProperty()
  createdByUserId!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
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

export class PaginatedExercisesResponseDto {
  @ApiProperty({ type: [ExerciseResponseDto] })
  data!: ExerciseResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}
