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
import { CreateTrainingPlanDto } from './dto/create-training-plan.dto';
import { ListTrainingPlansQueryDto } from './dto/list-training-plans-query.dto';
import { ReplaceTrainingPlanWorkoutsDto } from './dto/replace-training-plan-workouts.dto';
import { UpdateTrainingPlanDto } from './dto/update-training-plan.dto';
import { UpdateTrainingPlanExerciseDto } from './dto/update-training-plan-exercise.dto';
import { UpdateTrainingPlanStatusDto } from './dto/update-training-plan-status.dto';
import { UpdateTrainingPlanWorkoutDto } from './dto/update-training-plan-workout.dto';
import {
  PaginatedTrainingPlansResponseDto,
  TrainingPlanResponseDto,
} from './dto/training-plan-response.dto';
import { TrainingPlansService } from './training-plans.service';

@ApiTags('training-plans')
@ApiBearerAuth('access-token')
@Controller('clients/:clientId/training-plans')
export class TrainingPlansController {
  constructor(private readonly plans: TrainingPlansService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.TRAINER)
  @HttpCode(HttpStatus.CREATED)
  @ApiParam({ name: 'clientId', description: 'Client profile UUID' })
  @ApiOperation({
    summary:
      'Create a DRAFT Training Plan for a Client. TRAINER must currently be assigned. createdByUserId is provenance only and does not grant later access after reassignment.',
  })
  @ApiCreatedResponse({ type: TrainingPlanResponseDto })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiConflictResponse({ description: 'Client is disabled' })
  create(
    @Param('clientId', new ParseUUIDPipe({ version: '4' })) clientId: string,
    @Body() dto: CreateTrainingPlanDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<TrainingPlanResponseDto> {
    return this.plans.create(clientId, dto, user);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.TRAINER)
  @ApiParam({ name: 'clientId', description: 'Client profile UUID' })
  @ApiOperation({
    summary:
      'List Training Plans for a Client. TRAINER access follows the current trainer-client assignment, not plan creator.',
  })
  @ApiOkResponse({ type: PaginatedTrainingPlansResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiBadRequestResponse()
  list(
    @Param('clientId', new ParseUUIDPipe({ version: '4' })) clientId: string,
    @Query() query: ListTrainingPlansQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PaginatedTrainingPlansResponseDto> {
    return this.plans.listForClient(clientId, query, user);
  }

  @Get(':planId')
  @Roles(UserRole.ADMIN, UserRole.TRAINER)
  @ApiParam({ name: 'clientId', description: 'Client profile UUID' })
  @ApiParam({ name: 'planId', description: 'Training plan UUID' })
  @ApiOperation({
    summary:
      'Get a Training Plan with ordered workout and exercise snapshots. Does not load live WorkoutTemplateExercise rows.',
  })
  @ApiOkResponse({ type: TrainingPlanResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiBadRequestResponse()
  getById(
    @Param('clientId', new ParseUUIDPipe({ version: '4' })) clientId: string,
    @Param('planId', new ParseUUIDPipe({ version: '4' })) planId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<TrainingPlanResponseDto> {
    return this.plans.getById(clientId, planId, user);
  }

  @Patch(':planId')
  @Roles(UserRole.ADMIN, UserRole.TRAINER)
  @ApiParam({ name: 'clientId', description: 'Client profile UUID' })
  @ApiParam({ name: 'planId', description: 'Training plan UUID' })
  @ApiOperation({
    summary:
      'Update plan metadata. ARCHIVED plans are read-only until reactivated. Status is not changed here.',
  })
  @ApiOkResponse({ type: TrainingPlanResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiConflictResponse()
  @ApiBadRequestResponse()
  update(
    @Param('clientId', new ParseUUIDPipe({ version: '4' })) clientId: string,
    @Param('planId', new ParseUUIDPipe({ version: '4' })) planId: string,
    @Body() dto: UpdateTrainingPlanDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<TrainingPlanResponseDto> {
    return this.plans.update(clientId, planId, dto, user);
  }

  @Put(':planId/workouts')
  @Roles(UserRole.ADMIN, UserRole.TRAINER)
  @ApiParam({ name: 'clientId', description: 'Client profile UUID' })
  @ApiParam({ name: 'planId', description: 'Training plan UUID' })
  @ApiOperation({
    summary:
      'Replace plan workouts by snapshotting usable Workout Templates. Resets plan-owned exercise personalization. Position is assigned from array order. Empty list is allowed only while DRAFT.',
  })
  @ApiOkResponse({ type: TrainingPlanResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiConflictResponse()
  @ApiBadRequestResponse()
  replaceWorkouts(
    @Param('clientId', new ParseUUIDPipe({ version: '4' })) clientId: string,
    @Param('planId', new ParseUUIDPipe({ version: '4' })) planId: string,
    @Body() dto: ReplaceTrainingPlanWorkoutsDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<TrainingPlanResponseDto> {
    return this.plans.replaceWorkouts(clientId, planId, dto.workouts, user);
  }

  @Patch(':planId/workouts/:planWorkoutId')
  @Roles(UserRole.ADMIN, UserRole.TRAINER)
  @ApiParam({ name: 'clientId', description: 'Client profile UUID' })
  @ApiParam({ name: 'planId', description: 'Training plan UUID' })
  @ApiParam({ name: 'planWorkoutId', description: 'Plan workout UUID' })
  @ApiOperation({
    summary:
      'Update plan-owned scheduledDay and notes without resnapshotting the source template. Use PUT /workouts to rebuild structure from templates.',
  })
  @ApiOkResponse({ type: TrainingPlanResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiConflictResponse()
  @ApiBadRequestResponse()
  updateWorkout(
    @Param('clientId', new ParseUUIDPipe({ version: '4' })) clientId: string,
    @Param('planId', new ParseUUIDPipe({ version: '4' })) planId: string,
    @Param('planWorkoutId', new ParseUUIDPipe({ version: '4' }))
    planWorkoutId: string,
    @Body() dto: UpdateTrainingPlanWorkoutDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<TrainingPlanResponseDto> {
    return this.plans.updateWorkout(clientId, planId, planWorkoutId, dto, user);
  }

  @Patch(':planId/exercises/:planExerciseId')
  @Roles(UserRole.ADMIN, UserRole.TRAINER)
  @ApiParam({ name: 'clientId', description: 'Client profile UUID' })
  @ApiParam({ name: 'planId', description: 'Training plan UUID' })
  @ApiParam({ name: 'planExerciseId', description: 'Plan exercise UUID' })
  @ApiOperation({
    summary:
      'Personalize a snapshot prescription (sets, reps/duration, targetLoadKg in kilograms, RPE or RIR). exerciseId and exerciseNameSnapshot cannot be changed. Validates the merged prescription.',
  })
  @ApiOkResponse({ type: TrainingPlanResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiConflictResponse()
  @ApiBadRequestResponse()
  updateExercise(
    @Param('clientId', new ParseUUIDPipe({ version: '4' })) clientId: string,
    @Param('planId', new ParseUUIDPipe({ version: '4' })) planId: string,
    @Param('planExerciseId', new ParseUUIDPipe({ version: '4' }))
    planExerciseId: string,
    @Body() dto: UpdateTrainingPlanExerciseDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<TrainingPlanResponseDto> {
    return this.plans.updateExercise(
      clientId,
      planId,
      planExerciseId,
      dto,
      user,
    );
  }

  @Patch(':planId/status')
  @Roles(UserRole.ADMIN, UserRole.TRAINER)
  @ApiParam({ name: 'clientId', description: 'Client profile UUID' })
  @ApiParam({ name: 'planId', description: 'Training plan UUID' })
  @ApiOperation({
    summary:
      'Activate or archive a plan. Activation validates plan-owned data and currently ACTIVE Exercises (not source template status), archives any previous ACTIVE plan for the client, and enforces one ACTIVE plan per client.',
  })
  @ApiOkResponse({ type: TrainingPlanResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiConflictResponse()
  @ApiBadRequestResponse()
  updateStatus(
    @Param('clientId', new ParseUUIDPipe({ version: '4' })) clientId: string,
    @Param('planId', new ParseUUIDPipe({ version: '4' })) planId: string,
    @Body() dto: UpdateTrainingPlanStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<TrainingPlanResponseDto> {
    return this.plans.updateStatus(clientId, planId, dto.status, user);
  }
}
