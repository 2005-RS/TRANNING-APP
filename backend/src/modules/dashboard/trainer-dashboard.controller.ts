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
import { TrainerDashboardQueryDto } from './dto/dashboard-query.dto';
import {
  TrainerClientOverviewQueryDto,
  TrainerClientOverviewResponseDto,
} from './dto/trainer-client-overview.dto';
import { TrainerDashboardResponseDto } from './dto/trainer-dashboard-response.dto';

@ApiTags('trainer-dashboard')
@ApiBearerAuth('access-token')
@Controller('trainers/me')
export class TrainerDashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('dashboard')
  @Roles(UserRole.TRAINER)
  @ApiOperation({
    summary:
      'Read-only operational dashboard for the authenticated Trainer. TrainerProfile is resolved from the access token; trainerId is not accepted. All Client rows are scoped to the current TrainerClientAssignment (endedAt IS NULL). Disabled Clients are counted separately and excluded from operational lists. Historical reviews do not restore visibility after reassignment.',
  })
  @ApiOkResponse({ type: TrainerDashboardResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiBadRequestResponse()
  getMine(
    @Query() query: TrainerDashboardQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<TrainerDashboardResponseDto> {
    return this.dashboard.getTrainerDashboard(user, query.inactivityDays);
  }

  @Get('reports/clients')
  @Roles(UserRole.TRAINER)
  @ApiOperation({
    summary:
      'Paginated operational overview of currently assigned ACTIVE Clients. Search is parameterized ILIKE on firstName/lastName with wildcard escaping. Filters are allowlisted booleans and inactivityDays. Does not return body-measurement values, CheckIn text, or actual WorkoutSets. Unassigned Clients never appear. One SQL page query; no per-Client round trips.',
  })
  @ApiOkResponse({ type: TrainerClientOverviewResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiBadRequestResponse()
  listAssignedClients(
    @Query() query: TrainerClientOverviewQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<TrainerClientOverviewResponseDto> {
    return this.dashboard.listTrainerClientOverview(user, query);
  }
}
