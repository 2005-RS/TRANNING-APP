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
import { ListNutritionPlansQueryDto } from './dto/list-nutrition-plans-query.dto';
import {
  CurrentNutritionPlanResponseDto,
  PaginatedNutritionPlansResponseDto,
  NutritionPlanResponseDto,
} from './dto/nutrition-plan-response.dto';
import { NutritionPlansService } from './nutrition-plans.service';

@ApiTags('client-nutrition-plans')
@ApiBearerAuth('access-token')
@Controller('clients/me/nutrition-plans')
export class ClientNutritionPlansController {
  constructor(private readonly plans: NutritionPlansService) {}

  @Get()
  @Roles(UserRole.CLIENT)
  @ApiOperation({
    summary:
      "List the authenticated Client's ACTIVE and ARCHIVED nutrition plans. DRAFT plans are hidden. Read-only. This is a prescribed plan, not actual intake.",
  })
  @ApiOkResponse({ type: PaginatedNutritionPlansResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiBadRequestResponse()
  listMine(
    @Query() query: ListNutritionPlansQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PaginatedNutritionPlansResponseDto> {
    return this.plans.listMine(query, user);
  }

  @Get('current')
  @Roles(UserRole.CLIENT)
  @ApiOperation({
    summary:
      "Return the Client's current ACTIVE Nutrition Plan, or { nutritionPlan: null } when none exists. Totals come from meal-item snapshots, not live Food catalog values.",
  })
  @ApiOkResponse({ type: CurrentNutritionPlanResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  getCurrent(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CurrentNutritionPlanResponseDto> {
    return this.plans.getCurrentMine(user);
  }

  @Get(':planId')
  @Roles(UserRole.CLIENT)
  @ApiParam({ name: 'planId', description: 'Nutrition plan UUID' })
  @ApiOperation({
    summary:
      "Get an ACTIVE or ARCHIVED plan owned by the authenticated Client. DRAFT and other clients' plans return 404. CLIENT cannot mutate nutrition plans.",
  })
  @ApiOkResponse({ type: NutritionPlanResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiBadRequestResponse()
  getMineById(
    @Param('planId', new ParseUUIDPipe({ version: '4' })) planId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<NutritionPlanResponseDto> {
    return this.plans.getMineById(planId, user);
  }
}
