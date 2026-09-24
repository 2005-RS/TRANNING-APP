import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
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

@ApiTags('client-progress')
@ApiBearerAuth('access-token')
@Controller('clients/me/progress')
export class ClientProgressController {
  constructor(private readonly progress: ProgressService) {}

  @Get('summary')
  @Roles(UserRole.CLIENT)
  @ApiOperation({
    summary:
      'Completed-training summary for the authenticated Client. Metrics are derived from WorkoutSet actuals in COMPLETED sessions only. IN_PROGRESS and CANCELLED sessions are excluded. Date filters are inclusive UTC calendar days on startedAt.',
  })
  @ApiOkResponse({ type: ProgressSummaryResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiBadRequestResponse()
  getSummary(
    @Query() query: ProgressSummaryQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ProgressSummaryResponseDto> {
    return this.progress.getSummaryMine(query, user);
  }

  @Get('exercises')
  @Roles(UserRole.CLIENT)
  @ApiOperation({
    summary:
      'Paginated per-Exercise performance summaries for the authenticated Client. Grouped by exerciseId + prescriptionType. Display name is the current canonical Exercise.name. Archived exercises remain visible.',
  })
  @ApiOkResponse({ type: PaginatedExerciseProgressResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiBadRequestResponse()
  listExercises(
    @Query() query: ListProgressExercisesQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PaginatedExerciseProgressResponseDto> {
    return this.progress.listExercisesMine(query, user);
  }

  @Get('exercises/:exerciseId')
  @Roles(UserRole.CLIENT)
  @ApiOperation({
    summary:
      'Exercise performance detail for the authenticated Client: aggregates, personal bests with first-achieved context, session-grouped history, and a derived trend for the current history page. Returns 404 when this Client has no completed performance for the Exercise.',
  })
  @ApiOkResponse({ type: ExerciseProgressDetailResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiBadRequestResponse()
  getExercise(
    @Param('exerciseId', new ParseUUIDPipe({ version: '4' }))
    exerciseId: string,
    @Query() query: ExerciseProgressDetailQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ExerciseProgressDetailResponseDto> {
    return this.progress.getExerciseMine(exerciseId, query, user);
  }
}
