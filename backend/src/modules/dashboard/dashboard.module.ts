import { Module } from '@nestjs/common';
import { ClientsModule } from '../clients/clients.module';
import { TrainersModule } from '../trainers/trainers.module';
import { AdminDashboardController } from './admin-dashboard.controller';
import { ClientDashboardController } from './client-dashboard.controller';
import { DashboardService } from './dashboard.service';
import { TrainerDashboardController } from './trainer-dashboard.controller';

@Module({
  imports: [ClientsModule, TrainersModule],
  // Static /clients/me/dashboard, /trainers/me/dashboard, /trainers/me/reports/clients,
  // and /admin/dashboard must not be captured by UUID params on other controllers.
  controllers: [
    ClientDashboardController,
    TrainerDashboardController,
    AdminDashboardController,
  ],
  providers: [DashboardService],
})
export class DashboardModule {}
