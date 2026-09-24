import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { UserRole } from '../users/enums/user-role.enum';
import { DashboardService } from './dashboard.service';
import { ClientDashboardQueryDto } from './dto/dashboard-query.dto';
import { ClientDashboardResponseDto } from './dto/client-dashboard-response.dto';

@ApiTags('client-dashboard')
@ApiBearerAuth('access-token')
@Controller('clients/me/dashboard')
export class ClientDashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get()
  @Roles(UserRole.CLIENT)
  @ApiOperation({
    summary:
      'Read-only dashboard for the authenticated Client. Identity comes from the access token; no clientId is accepted. Sections are request-time aggregations of existing domain tables. Missing data is null or zero, never 404. periodDays is a rolling window on WorkoutSession.startedAt for COMPLETED sessions only (Progress semantics). Signed progress-photo URLs are never issued.',
  })
  @ApiOkResponse({ type: ClientDashboardResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiBadRequestResponse()
  getMine(
    @Query() query: ClientDashboardQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ClientDashboardResponseDto> {
    return this.dashboard.getClientDashboard(user, query.periodDays);
  }
}
