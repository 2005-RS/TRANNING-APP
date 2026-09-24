import { Module } from '@nestjs/common';
import { ClientsModule } from '../clients/clients.module';
import { TrainerClientAssignmentsModule } from '../trainer-client-assignments/trainer-client-assignments.module';
import { ClientProgressController } from './client-progress.controller';
import { ProgressController } from './progress.controller';
import { ProgressService } from './progress.service';

@Module({
  imports: [ClientsModule, TrainerClientAssignmentsModule],
  // Static /clients/me/progress must register before /clients/:clientId/progress.
  controllers: [ClientProgressController, ProgressController],
  providers: [ProgressService],
})
export class ProgressModule {}
