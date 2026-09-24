import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule } from '../clients/clients.module';
import { TrainersModule } from '../trainers/trainers.module';
import { ClientTrainerAssignmentsController } from './client-trainer-assignments.controller';
import { TrainerClientAssignment } from './entities/trainer-client-assignment.entity';
import { TrainerAssignedClientsController } from './trainer-assigned-clients.controller';
import { TrainerClientAccessService } from './trainer-client-access.service';
import { TrainerClientAssignmentsService } from './trainer-client-assignments.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([TrainerClientAssignment]),
    TrainersModule,
    ClientsModule,
  ],
  controllers: [
    ClientTrainerAssignmentsController,
    TrainerAssignedClientsController,
  ],
  providers: [TrainerClientAssignmentsService, TrainerClientAccessService],
  exports: [TrainerClientAccessService],
})
export class TrainerClientAssignmentsModule {}
