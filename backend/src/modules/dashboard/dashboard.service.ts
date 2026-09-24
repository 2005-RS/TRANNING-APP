import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { ClientsService } from '../clients/clients.service';
import { TrainersService } from '../trainers/trainers.service';
import {
  TRAINER_CLIENT_OVERVIEW_DEFAULT_LIMIT,
  TRAINER_CLIENT_OVERVIEW_DEFAULT_PAGE,
} from './dashboard.constants';
import {
  requireInactivityDays,
  requirePeriodDays,
} from './dashboard-metrics.util';
import {
  loadActiveNutritionPlan,
  loadActiveTrainingPlan,
  loadAdminCounts,
  loadAssignedClientCounts,
  loadClientsWithoutActivePlan,
  loadClientsWithoutRecentTraining,
  loadCurrentWorkoutSession,
  loadLatestBodyMeasurements,
  loadLatestCheckIn,
  loadPendingCheckIns,
  loadPerformanceSummary,
  loadProgressPhotoSummary,
  loadRecentCompletedSessions,
  loadTrainerClientOverview,
  loadTrainerRecentCompletedSessions,
  loadUnreadNotificationCount,
} from './dashboard-sql';
import {
  toAdminDashboard,
  toClientDashboard,
  toOverviewResponse,
  toTrainerDashboard,
} from './dashboard.mapper';
import { AdminDashboardResponseDto } from './dto/admin-dashboard-response.dto';
import { ClientDashboardResponseDto } from './dto/client-dashboard-response.dto';
import {
  TrainerClientOverviewQueryDto,
  TrainerClientOverviewResponseDto,
} from './dto/trainer-client-overview.dto';
import { TrainerDashboardResponseDto } from './dto/trainer-dashboard-response.dto';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly clients: ClientsService,
    private readonly trainers: TrainersService,
  ) {}

  async getClientDashboard(
    actor: AuthenticatedUser,
    periodDaysInput?: number,
  ): Promise<ClientDashboardResponseDto> {
    const periodDays = requirePeriodDays(periodDaysInput);
    const profile = await this.requireClientProfile(actor.id);

    const [
      trainingPlan,
      nutritionPlan,
      currentSession,
      recentSessions,
      performance,
      measurements,
      photos,
      checkIn,
      unreadCount,
    ] = await Promise.all([
      loadActiveTrainingPlan(this.dataSource, profile.id),
      loadActiveNutritionPlan(this.dataSource, profile.id),
      loadCurrentWorkoutSession(this.dataSource, profile.id),
      loadRecentCompletedSessions(this.dataSource, profile.id),
      loadPerformanceSummary(this.dataSource, profile.id, periodDays),
      loadLatestBodyMeasurements(this.dataSource, profile.id),
      loadProgressPhotoSummary(this.dataSource, profile.id),
      loadLatestCheckIn(this.dataSource, profile.id),
      loadUnreadNotificationCount(this.dataSource, actor.id),
    ]);

    return toClientDashboard({
      periodDays,
      trainingPlan,
      nutritionPlan,
      currentSession,
      recentSessions,
      performance,
      measurements,
      photos,
      checkIn,
      unreadCount,
    });
  }

  async getTrainerDashboard(
    actor: AuthenticatedUser,
    inactivityDaysInput?: number,
  ): Promise<TrainerDashboardResponseDto> {
    const inactivityDays = requireInactivityDays(inactivityDaysInput);
    const profile = await this.requireTrainerProfile(actor.id);

    const [
      counts,
      pending,
      inactivity,
      missingTraining,
      missingNutrition,
      recentSessions,
      unreadCount,
    ] = await Promise.all([
      loadAssignedClientCounts(this.dataSource, profile.id),
      loadPendingCheckIns(this.dataSource, profile.id),
      loadClientsWithoutRecentTraining(
        this.dataSource,
        profile.id,
        inactivityDays,
      ),
      loadClientsWithoutActivePlan(
        this.dataSource,
        profile.id,
        'training_plans',
      ),
      loadClientsWithoutActivePlan(
        this.dataSource,
        profile.id,
        'nutrition_plans',
      ),
      loadTrainerRecentCompletedSessions(this.dataSource, profile.id),
      loadUnreadNotificationCount(this.dataSource, actor.id),
    ]);

    return toTrainerDashboard({
      inactivityDays,
      counts,
      pending,
      inactivity,
      missingTraining,
      missingNutrition,
      recentSessions,
      unreadCount,
    });
  }

  async getAdminDashboard(
    actor: AuthenticatedUser,
    periodDaysInput?: number,
  ): Promise<AdminDashboardResponseDto> {
    const periodDays = requirePeriodDays(periodDaysInput);
    const [counts, unreadCount] = await Promise.all([
      loadAdminCounts(this.dataSource, periodDays),
      loadUnreadNotificationCount(this.dataSource, actor.id),
    ]);
    return toAdminDashboard(periodDays, counts, unreadCount);
  }

  async listTrainerClientOverview(
    actor: AuthenticatedUser,
    query: TrainerClientOverviewQueryDto,
  ): Promise<TrainerClientOverviewResponseDto> {
    const profile = await this.requireTrainerProfile(actor.id);
    const page = query.page ?? TRAINER_CLIENT_OVERVIEW_DEFAULT_PAGE;
    const limit = query.limit ?? TRAINER_CLIENT_OVERVIEW_DEFAULT_LIMIT;
    if (query.inactivityDays !== undefined) {
      requireInactivityDays(query.inactivityDays);
    }

    const { totalItems, rows } = await loadTrainerClientOverview(
      this.dataSource,
      profile.id,
      query,
    );
    return toOverviewResponse(rows, page, limit, totalItems);
  }

  private async requireClientProfile(userId: string) {
    const profile = await this.clients.findByUserIdWithUser(userId);
    if (!profile) {
      this.logger.error(
        JSON.stringify({ event: 'client_profile_missing', userId }),
      );
      throw new InternalServerErrorException(
        'Client profile is missing for this account',
      );
    }
    return profile;
  }

  private async requireTrainerProfile(userId: string) {
    const profile = await this.trainers.findByUserIdWithUser(userId);
    if (!profile) {
      this.logger.error(
        JSON.stringify({ event: 'trainer_profile_missing', userId }),
      );
      throw new InternalServerErrorException(
        'Trainer profile is missing for this account',
      );
    }
    return profile;
  }
}
