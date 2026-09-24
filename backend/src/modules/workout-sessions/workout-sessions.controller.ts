import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
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
import {
  PaginatedWorkoutSessionsResponseDto,
  WorkoutSessionResponseDto,
} from './dto/workout-session-response.dto';
import { WorkoutSessionsService } from './workout-sessions.service';

@ApiTags('workout-sessions')
@ApiBearerAuth('access-token')
@Controller('clients/:clientId/workout-sessions')
export class WorkoutSessionsController {
  constructor(private readonly sessions: WorkoutSessionsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.TRAINER)
  @ApiParam({ name: 'clientId', description: 'Client profile UUID' })
  @ApiOperation({
    summary:
      'List workout sessions for a Client. Read-only. TRAINER access follows the current trainer-client assignment, not session or plan creator.',
  })
  @ApiOkResponse({ type: PaginatedWorkoutSessionsResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiBadRequestResponse()
  list(
    @Param('clientId', new ParseUUIDPipe({ version: '4' })) clientId: string,
    @Query() query: ListWorkoutSessionsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PaginatedWorkoutSessionsResponseDto> {
    return this.sessions.listForClient(clientId, query, user);
  }

  @Get(':sessionId')
  @Roles(UserRole.ADMIN, UserRole.TRAINER)
  @ApiParam({ name: 'clientId', description: 'Client profile UUID' })
  @ApiParam({ name: 'sessionId', description: 'Workout session UUID' })
  @ApiOperation({
    summary:
      'Get a Client workout session with prescription snapshot and actual sets. Read-only. Sessions belonging to another Client return 404.',
  })
  @ApiOkResponse({ type: WorkoutSessionResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiBadRequestResponse()
  getById(
    @Param('clientId', new ParseUUIDPipe({ version: '4' })) clientId: string,
    @Param('sessionId', new ParseUUIDPipe({ version: '4' })) sessionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<WorkoutSessionResponseDto> {
    return this.sessions.getByIdForClient(clientId, sessionId, user);
  }
}
