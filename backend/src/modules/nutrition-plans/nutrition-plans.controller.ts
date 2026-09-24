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
import { CreateNutritionPlanDto } from './dto/create-nutrition-plan.dto';
import { ListNutritionPlansQueryDto } from './dto/list-nutrition-plans-query.dto';
import {
  PaginatedNutritionPlansResponseDto,
  NutritionPlanResponseDto,
} from './dto/nutrition-plan-response.dto';
import { ReplaceNutritionPlanMealsDto } from './dto/replace-nutrition-plan-meals.dto';
import { UpdateNutritionPlanDto } from './dto/update-nutrition-plan.dto';
import { UpdateNutritionPlanMealItemDto } from './dto/update-nutrition-plan-meal-item.dto';
import { UpdateNutritionPlanStatusDto } from './dto/update-nutrition-plan-status.dto';
import { NutritionPlansService } from './nutrition-plans.service';

@ApiTags('nutrition-plans')
@ApiBearerAuth('access-token')
@Controller('clients/:clientId/nutrition-plans')
export class NutritionPlansController {
  constructor(private readonly plans: NutritionPlansService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.TRAINER)
  @HttpCode(HttpStatus.CREATED)
  @ApiParam({ name: 'clientId', description: 'Client profile UUID' })
  @ApiOperation({
    summary:
      'Create a DRAFT Nutrition Plan for a Client. TRAINER must currently be assigned. createdByUserId is provenance only and does not grant later access after reassignment. CLIENT cannot create plans.',
  })
  @ApiCreatedResponse({ type: NutritionPlanResponseDto })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiConflictResponse({ description: 'Client is disabled' })
  create(
    @Param('clientId', new ParseUUIDPipe({ version: '4' })) clientId: string,
    @Body() dto: CreateNutritionPlanDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<NutritionPlanResponseDto> {
    return this.plans.create(clientId, dto, user);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.TRAINER)
  @ApiParam({ name: 'clientId', description: 'Client profile UUID' })
  @ApiOperation({
    summary:
      'List Nutrition Plan summaries for a Client. TRAINER access follows the current trainer-client assignment, not plan creator. Meals are not loaded.',
  })
  @ApiOkResponse({ type: PaginatedNutritionPlansResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiBadRequestResponse()
  list(
    @Param('clientId', new ParseUUIDPipe({ version: '4' })) clientId: string,
    @Query() query: ListNutritionPlansQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PaginatedNutritionPlansResponseDto> {
    return this.plans.listForClient(clientId, query, user);
  }

  @Get(':planId')
  @Roles(UserRole.ADMIN, UserRole.TRAINER)
  @ApiParam({ name: 'clientId', description: 'Client profile UUID' })
  @ApiParam({ name: 'planId', description: 'Nutrition plan UUID' })
  @ApiOperation({
    summary:
      'Get a Nutrition Plan with ordered meals, snapshotted foods, derived meal totals, and prescribed targets. Totals never live-read the Food catalog.',
  })
  @ApiOkResponse({ type: NutritionPlanResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiBadRequestResponse()
  getById(
    @Param('clientId', new ParseUUIDPipe({ version: '4' })) clientId: string,
    @Param('planId', new ParseUUIDPipe({ version: '4' })) planId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<NutritionPlanResponseDto> {
    return this.plans.getById(clientId, planId, user);
  }

  @Patch(':planId')
  @Roles(UserRole.ADMIN, UserRole.TRAINER)
  @ApiParam({ name: 'clientId', description: 'Client profile UUID' })
  @ApiParam({ name: 'planId', description: 'Nutrition plan UUID' })
  @ApiOperation({
    summary:
      'Update plan metadata and prescribed daily targets. ARCHIVED plans are read-only until reactivated. Status is not changed here. Targets are not overwritten by meal totals.',
  })
  @ApiOkResponse({ type: NutritionPlanResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiConflictResponse()
  @ApiBadRequestResponse()
  update(
    @Param('clientId', new ParseUUIDPipe({ version: '4' })) clientId: string,
    @Param('planId', new ParseUUIDPipe({ version: '4' })) planId: string,
    @Body() dto: UpdateNutritionPlanDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<NutritionPlanResponseDto> {
    return this.plans.update(clientId, planId, dto, user);
  }

  @Put(':planId/meals')
  @Roles(UserRole.ADMIN, UserRole.TRAINER)
  @ApiParam({ name: 'clientId', description: 'Client profile UUID' })
  @ApiParam({ name: 'planId', description: 'Nutrition plan UUID' })
  @ApiOperation({
    summary:
      'Atomically replace plan meals by snapshotting currently ACTIVE Foods. Position is assigned from array order. Empty list is allowed only while DRAFT. Empty meals are rejected. ARCHIVED source Foods return 409 and roll back.',
  })
  @ApiOkResponse({ type: NutritionPlanResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiConflictResponse()
  @ApiBadRequestResponse()
  replaceMeals(
    @Param('clientId', new ParseUUIDPipe({ version: '4' })) clientId: string,
    @Param('planId', new ParseUUIDPipe({ version: '4' })) planId: string,
    @Body() dto: ReplaceNutritionPlanMealsDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<NutritionPlanResponseDto> {
    return this.plans.replaceMeals(clientId, planId, dto.meals, user);
  }

  @Patch(':planId/items/:mealItemId')
  @Roles(UserRole.ADMIN, UserRole.TRAINER)
  @ApiParam({ name: 'clientId', description: 'Client profile UUID' })
  @ApiParam({ name: 'planId', description: 'Nutrition plan UUID' })
  @ApiParam({ name: 'mealItemId', description: 'Plan meal item UUID' })
  @ApiOperation({
    summary:
      'Personalize prescribed quantityGrams or notes without resnapshotting Food. Changing the food itself requires PUT /meals so macros are copied again.',
  })
  @ApiOkResponse({ type: NutritionPlanResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiConflictResponse()
  @ApiBadRequestResponse()
  updateMealItem(
    @Param('clientId', new ParseUUIDPipe({ version: '4' })) clientId: string,
    @Param('planId', new ParseUUIDPipe({ version: '4' })) planId: string,
    @Param('mealItemId', new ParseUUIDPipe({ version: '4' }))
    mealItemId: string,
    @Body() dto: UpdateNutritionPlanMealItemDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<NutritionPlanResponseDto> {
    return this.plans.updateMealItem(clientId, planId, mealItemId, dto, user);
  }

  @Patch(':planId/status')
  @Roles(UserRole.ADMIN, UserRole.TRAINER)
  @ApiParam({ name: 'clientId', description: 'Client profile UUID' })
  @ApiParam({ name: 'planId', description: 'Nutrition plan UUID' })
  @ApiOperation({
    summary:
      'Activate or archive a plan. Activation requires at least one meal with items and currently ACTIVE source Foods, archives any previous ACTIVE plan for the client, and enforces one ACTIVE nutrition plan per client. Reactivating an ARCHIVED plan also requires source Foods to still be ACTIVE. An already-ACTIVE plan is not invalidated if a Food later archives.',
  })
  @ApiOkResponse({ type: NutritionPlanResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiConflictResponse()
  @ApiBadRequestResponse()
  updateStatus(
    @Param('clientId', new ParseUUIDPipe({ version: '4' })) clientId: string,
    @Param('planId', new ParseUUIDPipe({ version: '4' })) planId: string,
    @Body() dto: UpdateNutritionPlanStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<NutritionPlanResponseDto> {
    return this.plans.updateStatus(clientId, planId, dto.status, user);
  }
}
