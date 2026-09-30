import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { NutrientResponseDto } from './dto/nutrient-response.dto';
import { NutritionNutrientsService } from './nutrition-nutrients.service';

@ApiTags('nutrition-nutrients')
@ApiBearerAuth('access-token')
@Controller('nutrition/nutrients')
export class NutritionNutrientsController {
  constructor(private readonly nutrients: NutritionNutrientsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.TRAINER)
  @ApiOperation({ summary: 'List the read-only nutrient catalog.' })
  @ApiOkResponse({ type: [NutrientResponseDto] })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  list(): Promise<NutrientResponseDto[]> {
    return this.nutrients.list();
  }
}
