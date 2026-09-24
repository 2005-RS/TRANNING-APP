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
import { UserStatus } from '../../users/enums/user-status.enum';
import {
  SortDirection,
  TrainerSortField,
} from '../enums/trainer-sort-field.enum';
import {
  TRAINER_LIST_DEFAULT_LIMIT,
  TRAINER_LIST_DEFAULT_PAGE,
  TRAINER_LIST_MAX_LIMIT,
  TRAINER_SEARCH_MAX_LENGTH,
} from '../trainers.constants';

export class ListTrainersQueryDto {
  @ApiPropertyOptional({ default: TRAINER_LIST_DEFAULT_PAGE, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = TRAINER_LIST_DEFAULT_PAGE;

  @ApiPropertyOptional({
    default: TRAINER_LIST_DEFAULT_LIMIT,
    minimum: 1,
    maximum: TRAINER_LIST_MAX_LIMIT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(TRAINER_LIST_MAX_LIMIT)
  limit: number = TRAINER_LIST_DEFAULT_LIMIT;

  @ApiPropertyOptional({ maxLength: TRAINER_SEARCH_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(TRAINER_SEARCH_MAX_LENGTH)
  search?: string;

  @ApiPropertyOptional({ enum: UserStatus })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional({
    enum: TrainerSortField,
    default: TrainerSortField.CreatedAt,
  })
  @IsOptional()
  @IsEnum(TrainerSortField)
  sort: TrainerSortField = TrainerSortField.CreatedAt;

  @ApiPropertyOptional({ enum: SortDirection, default: SortDirection.Desc })
  @IsOptional()
  @IsEnum(SortDirection)
  direction: SortDirection = SortDirection.Desc;
}
