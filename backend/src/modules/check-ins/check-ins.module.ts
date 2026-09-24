import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule } from '../clients/clients.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TrainerClientAssignmentsModule } from '../trainer-client-assignments/trainer-client-assignments.module';
import { CheckInsController } from './check-ins.controller';
import { CheckInsService } from './check-ins.service';
import { ClientCheckInsController } from './client-check-ins.controller';
import { CheckInReview } from './entities/check-in-review.entity';
import { CheckIn } from './entities/check-in.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([CheckIn, CheckInReview]),
    ClientsModule,
    TrainerClientAssignmentsModule,
    NotificationsModule,
  ],
  // Static /clients/me/check-ins must register before /clients/:clientId/check-ins.
  controllers: [ClientCheckInsController, CheckInsController],
  providers: [CheckInsService],
  exports: [CheckInsService],
})
export class CheckInsModule {}
