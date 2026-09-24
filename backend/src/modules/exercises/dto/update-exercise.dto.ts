import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { ExerciseDifficultyLevel } from '../enums/exercise-difficulty-level.enum';
import { ExerciseEquipmentType } from '../enums/exercise-equipment-type.enum';
import { ExerciseMuscleGroup } from '../enums/exercise-muscle-group.enum';
import {
  EXERCISE_DESCRIPTION_MAX_LENGTH,
  EXERCISE_INSTRUCTIONS_MAX_LENGTH,
  EXERCISE_NAME_MAX_LENGTH,
  EXERCISE_NAME_MIN_LENGTH,
} from '../exercises.constants';
import { normalizeExerciseName } from '../exercise-text.util';

export class UpdateExerciseDto {
  @ApiPropertyOptional({
    example: 'Barbell Bench Press',
    minLength: EXERCISE_NAME_MIN_LENGTH,
    maxLength: EXERCISE_NAME_MAX_LENGTH,
  })
  @ValidateIf((_, value) => value !== undefined)
  @Transform(({ value }) =>
    typeof value === 'string' ? normalizeExerciseName(value) : value,
  )
  @IsString()
  @MinLength(EXERCISE_NAME_MIN_LENGTH)
  @MaxLength(EXERCISE_NAME_MAX_LENGTH)
  name?: string;

  @ApiPropertyOptional({
    maxLength: EXERCISE_DESCRIPTION_MAX_LENGTH,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(EXERCISE_DESCRIPTION_MAX_LENGTH)
  description?: string | null;

  @ApiPropertyOptional({
    maxLength: EXERCISE_INSTRUCTIONS_MAX_LENGTH,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(EXERCISE_INSTRUCTIONS_MAX_LENGTH)
  instructions?: string | null;

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
}
