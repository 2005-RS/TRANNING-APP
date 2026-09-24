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
import { ListTrainingPlansQueryDto } from './dto/list-training-plans-query.dto';
import {
  CurrentTrainingPlanResponseDto,
  PaginatedTrainingPlansResponseDto,
  TrainingPlanResponseDto,
} from './dto/training-plan-response.dto';
import { TrainingPlansService } from './training-plans.service';

@ApiTags('client-training-plans')
@ApiBearerAuth('access-token')
@Controller('clients/me/training-plans')
export class ClientTrainingPlansController {
  constructor(private readonly plans: TrainingPlansService) {}

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
