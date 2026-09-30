import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { NutritionFoodResponseDto } from '../nutrition-foods/dto/nutrition-food-response.dto';
import { UserRole } from '../users/enums/user-role.enum';
import { ClientNutritionFoodsService } from './client-nutrition-foods.service';
import {
  CreateClientFoodDto,
  ListClientFoodsQueryDto,
  PaginatedClientFoodsResponseDto,
} from './dto/client-foods.dto';

@ApiTags('client-nutrition-foods')
@ApiBearerAuth('access-token')
@Controller('clients/me/nutrition-foods')
export class ClientNutritionFoodsController {
  constructor(private readonly foods: ClientNutritionFoodsService) {}

  @Get()
  @Roles(UserRole.CLIENT)
  @ApiOperation({
    summary:
      'Foods the Client can log: ALL (catalog + own), PLAN (today’s plan) or RECENT.',
  })
  @ApiOkResponse({ type: PaginatedClientFoodsResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiBadRequestResponse()
  search(
    @Query() query: ListClientFoodsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PaginatedClientFoodsResponseDto> {
    return this.foods.search(user, query);
  }

  @Post()
  @Roles(UserRole.CLIENT)
  @ApiOperation({
    summary:
      'Create a private food from label values per portion. Visible only to this Client (and their coach in the journal).',
  })
  @ApiCreatedResponse({ type: NutritionFoodResponseDto })
  @ApiBadRequestResponse()
  create(
    @Body() dto: CreateClientFoodDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<NutritionFoodResponseDto> {
    return this.foods.createOwnFood(user, dto);
  }

  @Get('barcode/:barcode')
  @Roles(UserRole.CLIENT)
  @ApiOperation({
    summary:
      'Find a packaged product by barcode: local first, then Open Food Facts (imported once, ODbL).',
  })
  @ApiOkResponse({ type: NutritionFoodResponseDto })
  @ApiBadRequestResponse()
  @ApiNotFoundResponse()
  @ApiUnprocessableEntityResponse({
    description: 'The product lacks nutrition data.',
  })
  @ApiServiceUnavailableResponse({
    description: 'Open Food Facts is unreachable.',
  })
  findByBarcode(
    @Param('barcode') barcode: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<NutritionFoodResponseDto> {
    return this.foods.findByBarcode(user, barcode);
  }

  @Get(':foodId')
  @Roles(UserRole.CLIENT)
  @ApiOperation({
    summary:
      'Food detail with portions and nutrients, if visible to the Client.',
  })
  @ApiOkResponse({ type: NutritionFoodResponseDto })
  @ApiNotFoundResponse()
  getFood(
    @Param('foodId', new ParseUUIDPipe({ version: '4' })) foodId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<NutritionFoodResponseDto> {
    return this.foods.getFood(user, foodId);
  }
}
