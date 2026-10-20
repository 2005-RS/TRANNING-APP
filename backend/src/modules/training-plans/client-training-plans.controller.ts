import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
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
import { ListTrainingPlansQueryDto } from './dto/list-training-plans-query.dto';
import {
  CurrentTrainingPlanResponseDto,
  PaginatedTrainingPlansResponseDto,
  TrainingPlanResponseDto,
} from './dto/training-plan-response.dto';
import { TrainingPlansService } from './training-plans.service';
import { CreateSelfTrainingPlanDto } from './dto/create-self-training-plan.dto';
import {
  SELF_TRAINING_PLAN_THROTTLE_LIMIT,
  SELF_TRAINING_PLAN_THROTTLE_TTL_MS,
} from './training-plans.constants';

@ApiTags('client-training-plans')
@ApiBearerAuth('access-token')
@Controller('clients/me/training-plans')
export class ClientTrainingPlansController {
  constructor(private readonly plans: TrainingPlansService) {}

  @Post('self')
  @Roles(UserRole.CLIENT)
  @HttpCode(HttpStatus.CREATED)
  @Throttle({
    default: {
      limit: SELF_TRAINING_PLAN_THROTTLE_LIMIT,
      ttl: SELF_TRAINING_PLAN_THROTTLE_TTL_MS,
    },
  })
  @ApiOperation({
    summary:
      'Create and activate the client own plan ("Mi rutina") from published library routines',
  })
  @ApiCreatedResponse({ type: TrainingPlanResponseDto })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse({ description: 'A routine is missing or not published' })
  @ApiConflictResponse({ description: 'The client has an ACTIVE trainer plan' })
  createSelf(
    @Body() dto: CreateSelfTrainingPlanDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<TrainingPlanResponseDto> {
    return this.plans.createSelf(dto, user);
  }

  @Get()
  @Roles(UserRole.CLIENT)
  @ApiOperation({
    summary:
      "List the authenticated Client's ACTIVE and ARCHIVED plans. DRAFT plans are hidden. Read-only.",
  })
  @ApiOkResponse({ type: PaginatedTrainingPlansResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiBadRequestResponse()
  listMine(
    @Query() query: ListTrainingPlansQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PaginatedTrainingPlansResponseDto> {
    return this.plans.listMine(query, user);
  }

  @Get('current')
  @Roles(UserRole.CLIENT)
  @ApiOperation({
    summary:
      "Return the Client's current ACTIVE Training Plan, or { trainingPlan: null } when none exists.",
  })
  @ApiOkResponse({ type: CurrentTrainingPlanResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  getCurrent(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CurrentTrainingPlanResponseDto> {
    return this.plans.getCurrentMine(user);
  }

  @Get(':planId')
  @Roles(UserRole.CLIENT)
  @ApiParam({ name: 'planId', description: 'Training plan UUID' })
  @ApiOperation({
    summary:
      "Get an ACTIVE or ARCHIVED plan owned by the authenticated Client. DRAFT and other clients' plans return 404.",
  })
  @ApiOkResponse({ type: TrainingPlanResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiBadRequestResponse()
  getMineById(
    @Param('planId', new ParseUUIDPipe({ version: '4' })) planId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<TrainingPlanResponseDto> {
    return this.plans.getMineById(planId, user);
  }
}
