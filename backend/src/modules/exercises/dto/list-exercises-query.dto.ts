import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ExerciseDifficultyLevel } from '../enums/exercise-difficulty-level.enum';
import { ExerciseEquipmentType } from '../enums/exercise-equipment-type.enum';
import { ExerciseMuscleGroup } from '../enums/exercise-muscle-group.enum';
import {
  ExerciseSortField,
  SortDirection,
} from '../enums/exercise-sort-field.enum';
import { ExerciseStatus } from '../enums/exercise-status.enum';
import {
  EXERCISE_LIST_DEFAULT_LIMIT,
  EXERCISE_LIST_DEFAULT_PAGE,
  EXERCISE_LIST_MAX_LIMIT,
  EXERCISE_SEARCH_MAX_LENGTH,
} from '../exercises.constants';

export class ListExercisesQueryDto {
  @ApiPropertyOptional({ default: EXERCISE_LIST_DEFAULT_PAGE, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = EXERCISE_LIST_DEFAULT_PAGE;

  @ApiPropertyOptional({
    default: EXERCISE_LIST_DEFAULT_LIMIT,
    minimum: 1,
    maximum: EXERCISE_LIST_MAX_LIMIT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(EXERCISE_LIST_MAX_LIMIT)
  limit: number = EXERCISE_LIST_DEFAULT_LIMIT;

  @ApiPropertyOptional({ maxLength: EXERCISE_SEARCH_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(EXERCISE_SEARCH_MAX_LENGTH)
  search?: string;

  @ApiPropertyOptional({ enum: ExerciseMuscleGroup })
  @IsOptional()
  @IsEnum(ExerciseMuscleGroup)
  primaryMuscleGroup?: ExerciseMuscleGroup;

  @ApiPropertyOptional({ enum: ExerciseEquipmentType })
  @IsOptional()
  @IsEnum(ExerciseEquipmentType)
  equipmentType?: ExerciseEquipmentType;

  @ApiPropertyOptional({ enum: ExerciseDifficultyLevel })
  @IsOptional()
  @IsEnum(ExerciseDifficultyLevel)
  difficultyLevel?: ExerciseDifficultyLevel;

  @ApiPropertyOptional({
    enum: ExerciseStatus,
    description:
      'Defaults to ACTIVE when omitted so training-plan selection stays on usable exercises.',
  })
  @IsOptional()
  @IsEnum(ExerciseStatus)
  status?: ExerciseStatus;

  @ApiPropertyOptional({
    enum: ExerciseSortField,
    default: ExerciseSortField.CreatedAt,
  })
  @IsOptional()
  @IsEnum(ExerciseSortField)
  sort: ExerciseSortField = ExerciseSortField.CreatedAt;

  @ApiPropertyOptional({ enum: SortDirection, default: SortDirection.Desc })
  @IsOptional()
  @IsEnum(SortDirection)
  direction: SortDirection = SortDirection.Desc;
}
