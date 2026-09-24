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
  Put,
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
import { ListWorkoutSessionsQueryDto } from './dto/list-workout-sessions-query.dto';
import { ReplaceWorkoutSetsDto } from './dto/replace-workout-sets.dto';
import { StartWorkoutSessionDto } from './dto/start-workout-session.dto';
import { UpdateWorkoutSessionStatusDto } from './dto/update-workout-session-status.dto';
import {
  CurrentWorkoutSessionResponseDto,
  PaginatedWorkoutSessionsResponseDto,
  WorkoutSessionResponseDto,
} from './dto/workout-session-response.dto';
import { WorkoutSessionsService } from './workout-sessions.service';

@ApiTags('client-workout-sessions')
@ApiBearerAuth('access-token')
@Controller('clients/me/workout-sessions')
export class ClientWorkoutSessionsController {
  constructor(private readonly sessions: WorkoutSessionsService) {}

  @Post()
  @Roles(UserRole.CLIENT)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Start a Workout Session from a workout on the Client current ACTIVE Training Plan. Snapshots the plan prescription. One IN_PROGRESS session per Client.',
  })
  @ApiCreatedResponse({ type: WorkoutSessionResponseDto })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiConflictResponse({
    description:
      'An IN_PROGRESS session already exists, or the Client is disabled.',
  })
  start(
    @Body() dto: StartWorkoutSessionDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<WorkoutSessionResponseDto> {
    return this.sessions.start(dto, user);
  }

  @Get()
  @Roles(UserRole.CLIENT)
  @ApiOperation({
    summary:
      'List the authenticated Client workout sessions. Summaries only. Default order startedAt DESC. dateFrom/dateTo are inclusive UTC calendar days on startedAt.',
  })
  @ApiOkResponse({ type: PaginatedWorkoutSessionsResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiBadRequestResponse()
  listMine(
    @Query() query: ListWorkoutSessionsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PaginatedWorkoutSessionsResponseDto> {
    return this.sessions.listMine(query, user);
  }

  @Get('current')
  @Roles(UserRole.CLIENT)
  @ApiOperation({
    summary:
      'Return the IN_PROGRESS session for resume, or { workoutSession: null } when none exists.',
  })
  @ApiOkResponse({ type: CurrentWorkoutSessionResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  getCurrent(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CurrentWorkoutSessionResponseDto> {
    return this.sessions.getCurrentMine(user);
  }

  @Put(':sessionId/exercises/:sessionExerciseId/sets')
  @Roles(UserRole.CLIENT)
  @ApiParam({ name: 'sessionId', description: 'Workout session UUID' })
  @ApiParam({
    name: 'sessionExerciseId',
    description: 'Workout session exercise UUID',
  })
  @ApiOperation({
    summary:
      'Atomically replace actual sets for one session exercise. Session must be IN_PROGRESS. setNumber is assigned from array order. Empty array clears recorded sets.',
  })
  @ApiOkResponse({ type: WorkoutSessionResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiConflictResponse()
  @ApiBadRequestResponse()
  replaceSets(
    @Param('sessionId', new ParseUUIDPipe({ version: '4' })) sessionId: string,
    @Param('sessionExerciseId', new ParseUUIDPipe({ version: '4' }))
    sessionExerciseId: string,
    @Body() dto: ReplaceWorkoutSetsDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<WorkoutSessionResponseDto> {
    return this.sessions.replaceSets(
      sessionId,
      sessionExerciseId,
      dto.sets,
      user,
    );
  }

  @Patch(':sessionId/status')
  @Roles(UserRole.CLIENT)
  @ApiParam({ name: 'sessionId', description: 'Workout session UUID' })
  @ApiOperation({
    summary:
      'Complete or cancel an IN_PROGRESS session. COMPLETED requires at least one recorded set. Terminal states are immutable. Repeated identical status is idempotent.',
  })
  @ApiOkResponse({ type: WorkoutSessionResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiConflictResponse()
  @ApiBadRequestResponse()
  updateStatus(
    @Param('sessionId', new ParseUUIDPipe({ version: '4' })) sessionId: string,
    @Body() dto: UpdateWorkoutSessionStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<WorkoutSessionResponseDto> {
    return this.sessions.updateStatus(sessionId, dto.status, user);
  }

  @Get(':sessionId')
  @Roles(UserRole.CLIENT)
  @ApiParam({ name: 'sessionId', description: 'Workout session UUID' })
  @ApiOperation({
    summary:
      'Get own session detail with prescription snapshot and actual sets. Foreign sessions return 404.',
  })
  @ApiOkResponse({ type: WorkoutSessionResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiBadRequestResponse()
  getMineById(
    @Param('sessionId', new ParseUUIDPipe({ version: '4' })) sessionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<WorkoutSessionResponseDto> {
    return this.sessions.getMineById(sessionId, user);
  }
}
