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
import { BodyMeasurementsService } from './body-measurements.service';
import {
  CreateBodyMeasurementDto,
  ListBodyMeasurementsQueryDto,
  UpdateBodyMeasurementDto,
} from './dto/body-measurement-input.dto';
import {
  BodyMeasurementResponseDto,
  PaginatedBodyMeasurementsResponseDto,
} from './dto/body-measurement-response.dto';

@ApiTags('client-body-measurements')
@ApiBearerAuth('access-token')
@Controller('clients/me/body-measurements')
export class ClientBodyMeasurementsController {
  constructor(private readonly measurements: BodyMeasurementsService) {}

  @Post()
  @Roles(UserRole.CLIENT)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Record a body measurement for the authenticated Client. Canonical units: kilograms, centimeters, and body-fat percentage. At least one metric is required. Notes alone are not a measurement. measuredAt may be omitted (server UTC now) or backdated. TRAINER and ADMIN cannot write. There is no measurement DELETE in v1; correct via PATCH.',
  })
  @ApiCreatedResponse({ type: BodyMeasurementResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiBadRequestResponse()
  create(
    @Body() dto: CreateBodyMeasurementDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<BodyMeasurementResponseDto> {
    return this.measurements.createMine(dto, user);
  }

  @Get()
  @Roles(UserRole.CLIENT)
  @ApiOperation({
    summary:
      'List the authenticated Client body measurements. Default order measuredAt DESC. dateFrom/dateTo are inclusive UTC calendar days. hasBodyWeight=true returns only rows with bodyWeightKg for bodyweight history charts. There is no separate bodyweight table.',
  })
  @ApiOkResponse({ type: PaginatedBodyMeasurementsResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiBadRequestResponse()
  list(
    @Query() query: ListBodyMeasurementsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PaginatedBodyMeasurementsResponseDto> {
    return this.measurements.listMine(query, user);
  }

  @Get(':measurementId')
  @Roles(UserRole.CLIENT)
  @ApiParam({ name: 'measurementId', description: 'Body measurement UUID' })
  @ApiOperation({
    summary:
      'Body measurement detail for the authenticated Client. Foreign UUIDs return 404.',
  })
  @ApiOkResponse({ type: BodyMeasurementResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiBadRequestResponse()
  getOne(
    @Param('measurementId', new ParseUUIDPipe({ version: '4' }))
    measurementId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<BodyMeasurementResponseDto> {
    return this.measurements.getMine(measurementId, user);
  }

  @Patch(':measurementId')
  @Roles(UserRole.CLIENT)
  @ApiParam({ name: 'measurementId', description: 'Body measurement UUID' })
  @ApiOperation({
    summary:
      'Correct a body measurement owned by the authenticated Client. The merged result must still contain at least one metric. clientProfileId, id, and timestamps are not writable. TRAINER and ADMIN cannot mutate measurements.',
  })
  @ApiOkResponse({ type: BodyMeasurementResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiBadRequestResponse()
  update(
    @Param('measurementId', new ParseUUIDPipe({ version: '4' }))
    measurementId: string,
    @Body() dto: UpdateBodyMeasurementDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<BodyMeasurementResponseDto> {
    return this.measurements.updateMine(measurementId, dto, user);
  }
}
