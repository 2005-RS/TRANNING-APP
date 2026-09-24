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
import { CreateNutritionFoodDto } from './dto/create-nutrition-food.dto';
import { ListNutritionFoodsQueryDto } from './dto/list-nutrition-foods-query.dto';
import {
  NutritionFoodResponseDto,
  PaginatedNutritionFoodsResponseDto,
} from './dto/nutrition-food-response.dto';
import { UpdateNutritionFoodDto } from './dto/update-nutrition-food.dto';
import { UpdateNutritionFoodStatusDto } from './dto/update-nutrition-food-status.dto';
import { NutritionFoodsService } from './nutrition-foods.service';

@ApiTags('nutrition-foods')
@ApiBearerAuth('access-token')
@Controller('nutrition/foods')
export class NutritionFoodsController {
  constructor(private readonly foods: NutritionFoodsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.TRAINER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Create an ACTIVE catalog food. Nutrition is stored per 100 grams. Creator is the authenticated user. CLIENT has no catalog access. Calories are not required to equal 4P+4C+9F.',
  })
  @ApiCreatedResponse({ type: NutritionFoodResponseDto })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  create(
    @Body() dto: CreateNutritionFoodDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<NutritionFoodResponseDto> {
    return this.foods.create(dto, user);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.TRAINER)
  @ApiOperation({
    summary:
      'List catalog foods. Defaults to ACTIVE, which ADMIN and TRAINER share. ARCHIVED lists are ADMIN (all) or creator TRAINER (own). CLIENT has no access.',
  })
  @ApiOkResponse({ type: PaginatedNutritionFoodsResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiBadRequestResponse()
  list(
    @Query() query: ListNutritionFoodsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PaginatedNutritionFoodsResponseDto> {
    return this.foods.list(query, user);
  }

  @Get(':foodId')
  @Roles(UserRole.ADMIN, UserRole.TRAINER)
  @ApiParam({ name: 'foodId', description: 'Nutrition food UUID' })
  @ApiOperation({
    summary:
      'Get a catalog food. ACTIVE foods are readable by ADMIN and TRAINER. ARCHIVED foods are readable by ADMIN and the creating TRAINER only; other trainers receive 404.',
  })
  @ApiOkResponse({ type: NutritionFoodResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiBadRequestResponse()
  getById(
    @Param('foodId', new ParseUUIDPipe({ version: '4' })) foodId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<NutritionFoodResponseDto> {
    return this.foods.getById(foodId, user);
  }

  @Patch(':foodId')
  @Roles(UserRole.ADMIN, UserRole.TRAINER)
  @ApiParam({ name: 'foodId', description: 'Nutrition food UUID' })
  @ApiOperation({
    summary:
      'Update catalog fields. ADMIN may update any food. TRAINER may update only foods they created. Other trainers receive 404. Existing NutritionPlan snapshots are not rewritten.',
  })
  @ApiOkResponse({ type: NutritionFoodResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiBadRequestResponse()
  update(
    @Param('foodId', new ParseUUIDPipe({ version: '4' })) foodId: string,
    @Body() dto: UpdateNutritionFoodDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<NutritionFoodResponseDto> {
    return this.foods.update(foodId, dto, user);
  }

  @Patch(':foodId/status')
  @Roles(UserRole.ADMIN, UserRole.TRAINER)
  @ApiParam({ name: 'foodId', description: 'Nutrition food UUID' })
  @ApiOperation({
    summary:
      'Archive or reactivate a food. Idempotent. Does not delete. Existing NutritionPlan snapshots stay unchanged. Archived foods cannot be used in new snapshots.',
  })
  @ApiOkResponse({ type: NutritionFoodResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiConflictResponse()
  @ApiBadRequestResponse()
  updateStatus(
    @Param('foodId', new ParseUUIDPipe({ version: '4' })) foodId: string,
    @Body() dto: UpdateNutritionFoodStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<NutritionFoodResponseDto> {
    return this.foods.updateStatus(foodId, dto.status, user);
  }
}
