import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule } from '../clients/clients.module';
import { TrainerClientAssignmentsModule } from '../trainer-client-assignments/trainer-client-assignments.module';
import { BodyMeasurementsController } from './body-measurements.controller';
import { BodyMeasurementsService } from './body-measurements.service';
import { ClientBodyMeasurementsController } from './client-body-measurements.controller';
import { BodyMeasurement } from './entities/body-measurement.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([BodyMeasurement]),
    ClientsModule,
    TrainerClientAssignmentsModule,
  ],
  // Static /clients/me/body-measurements must register before /clients/:clientId/body-measurements.
  controllers: [ClientBodyMeasurementsController, BodyMeasurementsController],
  providers: [BodyMeasurementsService],
  exports: [BodyMeasurementsService],
})
export class BodyMeasurementsModule {}
