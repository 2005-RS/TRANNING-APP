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
import {
  ExerciseProgressDetailQueryDto,
  ListProgressExercisesQueryDto,
  ProgressSummaryQueryDto,
} from './dto/progress-query.dto';
import {
  ExerciseProgressDetailResponseDto,
  PaginatedExerciseProgressResponseDto,
  ProgressSummaryResponseDto,
} from './dto/progress-response.dto';
import { ProgressService } from './progress.service';

@ApiTags('progress')
@ApiBearerAuth('access-token')
@Controller('clients/:clientId/progress')
export class ProgressController {
  constructor(private readonly progress: ProgressService) {}

  @Get('summary')
  @Roles(UserRole.ADMIN, UserRole.TRAINER)
  @ApiParam({ name: 'clientId', description: 'Client profile UUID' })
  @ApiOperation({
    summary:
      'Read-only completed-training summary for a Client. ADMIN may read any Client. TRAINER access requires the current trainer-client assignment. Unassigned trainers receive 404. CLIENT is 403. Metrics use WorkoutSet actuals in COMPLETED sessions only.',
  })
  @ApiOkResponse({ type: ProgressSummaryResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiBadRequestResponse()
  getSummary(
    @Param('clientId', new ParseUUIDPipe({ version: '4' })) clientId: string,
    @Query() query: ProgressSummaryQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ProgressSummaryResponseDto> {
    return this.progress.getSummaryForClient(clientId, query, user);
  }

  @Get('exercises')
  @Roles(UserRole.ADMIN, UserRole.TRAINER)
  @ApiParam({ name: 'clientId', description: 'Client profile UUID' })
  @ApiOperation({
    summary:
      'Read-only paginated per-Exercise performance summaries. Grouped by exerciseId + prescriptionType. TRAINER access follows the current assignment.',
  })
  @ApiOkResponse({ type: PaginatedExerciseProgressResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiBadRequestResponse()
  listExercises(
    @Param('clientId', new ParseUUIDPipe({ version: '4' })) clientId: string,
    @Query() query: ListProgressExercisesQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PaginatedExerciseProgressResponseDto> {
    return this.progress.listExercisesForClient(clientId, query, user);
  }

  @Get('exercises/:exerciseId')
  @Roles(UserRole.ADMIN, UserRole.TRAINER)
  @ApiParam({ name: 'clientId', description: 'Client profile UUID' })
  @ApiParam({ name: 'exerciseId', description: 'Canonical Exercise UUID' })
  @ApiOperation({
    summary:
      'Read-only Exercise performance detail. estimated1RmKg uses Epley: load × (1 + reps / 30) for load > 0 and 1–10 reps, rounded to 2 decimals. It is not an actual tested 1RM. Returns 404 when the Client has no completed performance for the Exercise.',
  })
  @ApiOkResponse({ type: ExerciseProgressDetailResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiBadRequestResponse()
  getExercise(
    @Param('clientId', new ParseUUIDPipe({ version: '4' })) clientId: string,
    @Param('exerciseId', new ParseUUIDPipe({ version: '4' }))
    exerciseId: string,
    @Query() query: ExerciseProgressDetailQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ExerciseProgressDetailResponseDto> {
    return this.progress.getExerciseForClient(
      clientId,
      exerciseId,
      query,
      user,
    );
  }
}
