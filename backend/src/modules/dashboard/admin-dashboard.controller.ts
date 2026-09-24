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
import { AdminDashboardQueryDto } from './dto/dashboard-query.dto';
import { AdminDashboardResponseDto } from './dto/admin-dashboard-response.dto';

@ApiTags('admin-dashboard')
@ApiBearerAuth('access-token')
@Controller('admin/dashboard')
export class AdminDashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary:
      'Read-only system operational overview for the authenticated ADMIN. High-level counts only: no weights, measurements, progress photos, CheckIn responses, Trainer feedback, nutrition foods, or WorkoutSets. completedWorkoutSessions uses WorkoutSession.startedAt in the rolling periodDays window. unread notifications are the current ADMIN inbox only.',
  })
  @ApiOkResponse({ type: AdminDashboardResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiBadRequestResponse()
  getSystem(
    @Query() query: AdminDashboardQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AdminDashboardResponseDto> {
    return this.dashboard.getAdminDashboard(user, query.periodDays);
  }
}
