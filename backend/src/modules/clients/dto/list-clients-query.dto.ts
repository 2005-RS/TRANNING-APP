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
  CLIENT_LIST_DEFAULT_LIMIT,
  CLIENT_LIST_DEFAULT_PAGE,
  CLIENT_LIST_MAX_LIMIT,
  CLIENT_SEARCH_MAX_LENGTH,
} from '../clients.constants';
import { ClientExperienceLevel } from '../enums/client-experience-level.enum';
import { ClientPrimaryGoal } from '../enums/client-primary-goal.enum';
import {
  ClientSortField,
  SortDirection,
} from '../enums/client-sort-field.enum';

export class ListClientsQueryDto {
  @ApiPropertyOptional({ default: CLIENT_LIST_DEFAULT_PAGE, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = CLIENT_LIST_DEFAULT_PAGE;

  @ApiPropertyOptional({
    default: CLIENT_LIST_DEFAULT_LIMIT,
    minimum: 1,
    maximum: CLIENT_LIST_MAX_LIMIT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(CLIENT_LIST_MAX_LIMIT)
  limit: number = CLIENT_LIST_DEFAULT_LIMIT;

  @ApiPropertyOptional({ maxLength: CLIENT_SEARCH_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(CLIENT_SEARCH_MAX_LENGTH)
  search?: string;

  @ApiPropertyOptional({ enum: UserStatus })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional({ enum: ClientPrimaryGoal })
  @IsOptional()
  @IsEnum(ClientPrimaryGoal)
  primaryGoal?: ClientPrimaryGoal;

  @ApiPropertyOptional({ enum: ClientExperienceLevel })
  @IsOptional()
  @IsEnum(ClientExperienceLevel)
  experienceLevel?: ClientExperienceLevel;

  @ApiPropertyOptional({
    enum: ClientSortField,
    default: ClientSortField.CreatedAt,
  })
  @IsOptional()
  @IsEnum(ClientSortField)
  sort: ClientSortField = ClientSortField.CreatedAt;

  @ApiPropertyOptional({ enum: SortDirection, default: SortDirection.Desc })
  @IsOptional()
  @IsEnum(SortDirection)
  direction: SortDirection = SortDirection.Desc;
}
