import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { UserRole } from '../users/enums/user-role.enum';
import { CreateExerciseDto } from './dto/create-exercise.dto';
import {
  ExerciseResponseDto,
  PaginatedExercisesResponseDto,
} from './dto/exercise-response.dto';
import { ListExercisesQueryDto } from './dto/list-exercises-query.dto';
import { UpdateExerciseDto } from './dto/update-exercise.dto';
import { UpdateExerciseStatusDto } from './dto/update-exercise-status.dto';
import { ExercisesService } from './exercises.service';

@ApiTags('exercises')
@ApiBearerAuth('access-token')
@Controller('exercises')
export class ExercisesController {
  constructor(private readonly exercises: ExercisesService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.TRAINER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Create an ACTIVE catalog exercise. Creator is the authenticated user. Status and timestamps are server-controlled.',
  })
  @ApiCreatedResponse({ type: ExerciseResponseDto })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiConflictResponse({
    description: 'Same creator already has this normalized exercise name',
  })
  create(
    @Body() dto: CreateExerciseDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ExerciseResponseDto> {
    return this.exercises.create(dto, user);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.TRAINER)
  @ApiOperation({
    summary:
      'List catalog exercises. Defaults to ACTIVE. ADMIN and TRAINER share the catalog. CLIENT has no access.',
  })
  @ApiOkResponse({ type: PaginatedExercisesResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiBadRequestResponse()
  list(
    @Query() query: ListExercisesQueryDto,
  ): Promise<PaginatedExercisesResponseDto> {
    return this.exercises.list(query);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.TRAINER)
  @ApiParam({ name: 'id', description: 'Exercise UUID' })
  @ApiOperation({
    summary:
      'Get an exercise by ID, including ARCHIVED records used for future history.',
  })
  @ApiOkResponse({ type: ExerciseResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiBadRequestResponse()
  getById(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<ExerciseResponseDto> {
    return this.exercises.getById(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.TRAINER)
  @ApiParam({ name: 'id', description: 'Exercise UUID' })
  @ApiOperation({
    summary:
      'Update catalog fields. ADMIN may update any exercise. TRAINER may update only exercises they created. Status is not changed here.',
  })
  @ApiOkResponse({ type: ExerciseResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiConflictResponse()
  @ApiBadRequestResponse()
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateExerciseDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ExerciseResponseDto> {
    return this.exercises.update(id, dto, user);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN, UserRole.TRAINER)
  @ApiParam({ name: 'id', description: 'Exercise UUID' })
  @ApiOperation({
    summary:
      'Archive or reactivate an exercise. Idempotent. Does not delete the record.',
  })
  @ApiOkResponse({ type: ExerciseResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiBadRequestResponse()
  updateStatus(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateExerciseStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ExerciseResponseDto> {
    return this.exercises.updateStatus(id, dto.status, user);
  }
}
