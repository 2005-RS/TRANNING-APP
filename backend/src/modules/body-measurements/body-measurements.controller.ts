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
import { BodyMeasurementsService } from './body-measurements.service';
import { ListBodyMeasurementsQueryDto } from './dto/body-measurement-input.dto';
import {
  BodyMeasurementResponseDto,
  PaginatedBodyMeasurementsResponseDto,
} from './dto/body-measurement-response.dto';

@ApiTags('body-measurements')
@ApiBearerAuth('access-token')
@Controller('clients/:clientId/body-measurements')
export class BodyMeasurementsController {
  constructor(private readonly measurements: BodyMeasurementsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.TRAINER)
  @ApiParam({ name: 'clientId', description: 'Client profile UUID' })
  @ApiOperation({
    summary:
      'Read-only body measurements for a Client. ADMIN may read any Client. TRAINER access requires the current trainer-client assignment. Unassigned trainers receive 404. CLIENT is 403. There is no management write or delete.',
  })
  @ApiOkResponse({ type: PaginatedBodyMeasurementsResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiBadRequestResponse()
  list(
    @Param('clientId', new ParseUUIDPipe({ version: '4' })) clientId: string,
    @Query() query: ListBodyMeasurementsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PaginatedBodyMeasurementsResponseDto> {
    return this.measurements.listForClient(clientId, query, user);
  }

  @Get(':measurementId')
  @Roles(UserRole.ADMIN, UserRole.TRAINER)
  @ApiParam({ name: 'clientId', description: 'Client profile UUID' })
  @ApiParam({ name: 'measurementId', description: 'Body measurement UUID' })
  @ApiOperation({
    summary:
      'Read-only body measurement detail. Visibility follows the current TrainerClientAssignment. Historical rows are unchanged by reassignment.',
  })
  @ApiOkResponse({ type: BodyMeasurementResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiBadRequestResponse()
  getOne(
    @Param('clientId', new ParseUUIDPipe({ version: '4' })) clientId: string,
    @Param('measurementId', new ParseUUIDPipe({ version: '4' }))
    measurementId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<BodyMeasurementResponseDto> {
    return this.measurements.getForClient(clientId, measurementId, user);
  }
}
