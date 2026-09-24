import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { ExerciseStatus } from '../enums/exercise-status.enum';

export class UpdateExerciseStatusDto {
  @ApiProperty({ enum: ExerciseStatus })
  @IsEnum(ExerciseStatus)
  status!: ExerciseStatus;
}
